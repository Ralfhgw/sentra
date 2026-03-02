export interface Event {
  title: string;
  date: string;
  address: string | null;
  link: string | null;
  description: string | null;
  image: string | null;
  domain: string | null;
}

// page.tsx
export interface DayMeaning {
  name: string;
  country: string;
  description: string;
  url?: string;
}

// NewsClient.tsx / page.tsx
export type NewsClientProps = {
  events: Event[];
  dayMeanings: DayMeaning[];
  error: string;
};

// page.tsx
export interface JwtPayload {
  sub: string;
  userName: string;
  email: string;
}