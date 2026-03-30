import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { getBackgroundImage } from "./getBackgroundImage";
import { getUserSettings } from "@/utils/serverAuth";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CLOUDINARY_FOLDER = "user_profiles";
const PLACEHOLDER_IMAGES = [
  "bg_placeholder_01.jpg",
  "bg_placeholder_02.jpg",
  "bg_placeholder_03.jpg",
] as const;

const refreshPromises = new Map<string, Promise<string>>();

type StartpageSettings = Awaited<ReturnType<typeof getUserSettings>>;

export type StartpageBackgroundResponse =
  | {
    url: string | null;
    background: "gradient";
    pending?: boolean;
  }
  | {
    url: string;
    pending?: boolean;
  };

function gradientResponse(pending = false): StartpageBackgroundResponse {
  return { url: null, background: "gradient", pending };
}

function configureCloudinary(settings: StartpageSettings) {
  cloudinary.config({
    cloud_name: settings.key5!,
    api_key: settings.key4!,
    api_secret: settings.key3!,
    secure: true,
  });
}

function isOlderThanOneWeek(version?: string | number | null) {
  if (!version) {
    return true;
  }

  const updatedAtMs = Number(version) * 1000;

  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return Date.now() - updatedAtMs > ONE_WEEK_MS;
}

function isCloudinaryNotFound(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    http_code?: number;
    error?: { message?: string };
  };

  return (
    candidate.http_code === 404 ||
    candidate.error?.message?.toLowerCase().includes("not found") === true
  );
}

async function getExistingImage(userId: string) {
  try {
    return await cloudinary.api.resource(`${CLOUDINARY_FOLDER}/${userId}`);
  } catch (error) {
    if (isCloudinaryNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function uploadPlaceholder(userId: string) {
  const fileName =
    PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
  const filePath = path.join(process.cwd(), "public", fileName);

  await fs.access(filePath);

  const result = await cloudinary.uploader.upload(filePath, {
    public_id: userId,
    folder: CLOUDINARY_FOLDER,
    overwrite: true,
    invalidate: true,
  });

  return result.secure_url;
}

function runSingleRefresh(userId: string, factory: () => Promise<string>) {
  const existingPromise = refreshPromises.get(userId);
  if (existingPromise) {
    console.log("Awaiting in-flight background refresh for userId:", userId);
    return existingPromise;
  }

  const refreshPromise = factory().finally(() => {
    refreshPromises.delete(userId);
  });

  refreshPromises.set(userId, refreshPromise);
  return refreshPromise;
}

export function isStartpageBackgroundPending(userId: string) {
  return refreshPromises.has(userId);
}

export async function readStartpageBackground(
  userId: string
): Promise<StartpageBackgroundResponse> {
  const settings = await getUserSettings(userId);
  const hasCloudinaryKeys = Boolean(settings.key3 && settings.key4 && settings.key5);

  if (!hasCloudinaryKeys) {
    return gradientResponse(false);
  }
  
  // Get Cloudinary Settings
  configureCloudinary(settings);

  
  const existingImage = await getExistingImage(userId);
  const pending = isStartpageBackgroundPending(userId);

  if (!existingImage) {
    return gradientResponse(pending);
  }

  return {
    url: existingImage.secure_url,
    pending,
  };
}

export async function warmStartpageBackground(userId: string) {
  const settings = await getUserSettings(userId);
  const hasCloudinaryKeys = Boolean(settings.key3 && settings.key4 && settings.key5);
  const hasOpenAiKey = Boolean(settings.key2);

  if (!hasCloudinaryKeys) {
    console.log("Skipping startpage warmup without Cloudinary keys for userId:", userId);
    return null;
  }

  configureCloudinary(settings);

  const existingImage = await getExistingImage(userId);
  const needsRefresh =
    !existingImage || isOlderThanOneWeek(existingImage.version);

  if (!hasOpenAiKey) {
    if (!needsRefresh && existingImage) {
      return existingImage.secure_url;
    }

    return runSingleRefresh(userId, () => uploadPlaceholder(userId));
  }

  if (!needsRefresh && existingImage) {
    return existingImage.secure_url;
  }

  const lat = settings.lat;
  const lon = settings.lon;

  if (typeof lat !== "number" || typeof lon !== "number") {
    return runSingleRefresh(userId, () => uploadPlaceholder(userId));
  }

  return runSingleRefresh(userId, () =>
    getBackgroundImage({
      userId,
      lat,
      lon,
      openAiApiKey: settings.key2!,
      cloudinaryConfig: {
        cloudName: settings.key5!,
        apiKey: settings.key4!,
        apiSecret: settings.key3!,
      },
    })
  );
}
