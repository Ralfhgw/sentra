type WeatherDataPoint = {
  time: string;
  tempMin: string;
  tempMax: string;
  pressure: string;
  humidity: string;
  windSpeed: string;
  windDeg: string;
};

export function temperatureToPercentage(temperature: number) {
  const minTemp = -40;
  const maxTemp = 50;
  const minPercent = 8.9;
  const maxPercent = 100;
  temperature = Math.max(minTemp, Math.min(maxTemp, temperature));
  const percentage = minPercent + (temperature - minTemp) * (maxPercent - minPercent) / (maxTemp - minTemp);
  return percentage;
}

export function percentageToRotationHygro(percentage: number) {
  percentage = Math.max(0, Math.min(100, percentage));
  const dataPoints = [
    { percent: 0, rotation: 0 },
    { percent: 1, rotation: 10 },
    { percent: 2, rotation: 19 },
    { percent: 3, rotation: 28 },
    { percent: 4, rotation: 35.5 },
    { percent: 5, rotation: 42.5 },
    { percent: 6, rotation: 49 },
    { percent: 7, rotation: 55 },
    { percent: 8, rotation: 60 },
    { percent: 9, rotation: 64.5 },
    { percent: 10, rotation: 68.6 },
    { percent: 11, rotation: 72 },
    { percent: 12, rotation: 76 },
    { percent: 13, rotation: 79.5 },
    { percent: 14, rotation: 83.3 },
    { percent: 15, rotation: 87 },
    { percent: 16, rotation: 91.2 },
    { percent: 17, rotation: 94.6 },
    { percent: 18, rotation: 98.2 },
    { percent: 19, rotation: 102.2 },
    { percent: 20, rotation: 106.1 },
    { percent: 21, rotation: 109.6 },
    { percent: 22, rotation: 113.3 },
    { percent: 23, rotation: 116.8 },
    { percent: 24, rotation: 120 },
    { percent: 25, rotation: 123.5 },
    { percent: 26, rotation: 127 },
    { percent: 27, rotation: 130.7 },
    { percent: 28, rotation: 133.6 },
    { percent: 29, rotation: 137.4 },
    { percent: 30, rotation: 141 },
    { percent: 31, rotation: 144.1 },
    { percent: 32, rotation: 147.2 },
    { percent: 33, rotation: 150.7 },
    { percent: 34, rotation: 154 },
    { percent: 35, rotation: 157.2 },
    { percent: 36, rotation: 160.7 },
    { percent: 37, rotation: 163.8 },
    { percent: 38, rotation: 166.7 },
    { percent: 39, rotation: 170.2 },
    { percent: 40, rotation: 173.7 },
    { percent: 41, rotation: 176.5 },
    { percent: 42, rotation: 179.1 },
    { percent: 43, rotation: 182.5 },
    { percent: 44, rotation: 185 },
    { percent: 45, rotation: 188 },
    { percent: 46, rotation: 191 },
    { percent: 47, rotation: 193.8 },
    { percent: 48, rotation: 197 },
    { percent: 49, rotation: 199.6 },
    { percent: 50, rotation: 202.5 },
    { percent: 51, rotation: 204.8 },
    { percent: 52, rotation: 208 },
    { percent: 53, rotation: 210 },
    { percent: 54, rotation: 212.3 },
    { percent: 55, rotation: 214.8 },
    { percent: 56, rotation: 217.2 },
    { percent: 57, rotation: 220 },
    { percent: 58, rotation: 222.8 },
    { percent: 59, rotation: 224.7 },
    { percent: 60, rotation: 227.4 },
    { percent: 61, rotation: 229.6 },
    { percent: 62, rotation: 231.5 },
    { percent: 63, rotation: 233.5 },
    { percent: 64, rotation: 235.8 },
    { percent: 65, rotation: 237.8 },
    { percent: 66, rotation: 240 },
    { percent: 67, rotation: 242.2 },
    { percent: 68, rotation: 244.5 },
    { percent: 69, rotation: 246.6 },
    { percent: 70, rotation: 248.9 },
    { percent: 71, rotation: 251 },
    { percent: 72, rotation: 252.8 },
    { percent: 73, rotation: 254.6 },
    { percent: 74, rotation: 256.5 },
    { percent: 75, rotation: 258 },
    { percent: 76, rotation: 260 },
    { percent: 77, rotation: 262 },
    { percent: 78, rotation: 263.8 },
    { percent: 79, rotation: 265.8 },
    { percent: 80, rotation: 267.4 },
    { percent: 81, rotation: 269.2 },
    { percent: 82, rotation: 271 },
    { percent: 83, rotation: 272.8 },
    { percent: 84, rotation: 274.4 },
    { percent: 85, rotation: 275.8 },
    { percent: 86, rotation: 277.6 },
    { percent: 87, rotation: 279.3 },
    { percent: 88, rotation: 281 },
    { percent: 89, rotation: 282.7 },
    { percent: 90, rotation: 284.4 },
    { percent: 91, rotation: 286 },
    { percent: 92, rotation: 287 },
    { percent: 93, rotation: 288.5 },
    { percent: 94, rotation: 289.5 },
    { percent: 95, rotation: 290.7 },
    { percent: 96, rotation: 292 },
    { percent: 97, rotation: 293 },
    { percent: 98, rotation: 294.8 },
    { percent: 99, rotation: 295.8 },
    { percent: 100, rotation: 297.8 },
  ];
  for (const point of dataPoints) {
    if (point.percent === percentage) return point.rotation;
  }
  for (let i = 0; i < dataPoints.length - 1; i++) {
    if (percentage >= dataPoints[i].percent && percentage <= dataPoints[i + 1].percent) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];
      const ratio = (percentage - p1.percent) / (p2.percent - p1.percent);
      return p1.rotation + ratio * (p2.rotation - p1.rotation);
    }
  }
  return -149;
}

export function percentageToRotationPressure(pressureData: number) {
 /*  pressureData = 1009; */
  const dataPoints = [
    { pressure: 960, rotation: 139 },
    { pressure: 961, rotation: 140 },
    { pressure: 962, rotation: 139 },
    { pressure: 963, rotation: 142 },
    { pressure: 964, rotation: 145 },
    { pressure: 965, rotation: 148 },
    { pressure: 966, rotation: 152 },
    { pressure: 967, rotation: 155.5 },
    { pressure: 968, rotation: 158.7 },
    { pressure: 969, rotation: 162 },
    { pressure: 970, rotation: 165.5 },
    { pressure: 971, rotation: 169 },
    { pressure: 972, rotation: 172 },
    { pressure: 973, rotation: 175.5 },
    { pressure: 974, rotation: 179 },
    { pressure: 975, rotation: 182 },
    { pressure: 976, rotation: 185.2 },
    { pressure: 977, rotation: 189 },
    { pressure: 978, rotation: 192 },
    { pressure: 979, rotation: 195.5 },
    { pressure: 980, rotation: 199.4 },
    { pressure: 981, rotation: 202 },
    { pressure: 982, rotation: 205 },
    { pressure: 983, rotation: 208.8 },
    { pressure: 984, rotation: 212 },
    { pressure: 985, rotation: 215.6 },
    { pressure: 986, rotation: 218.8 },
    { pressure: 987, rotation: 222.2 },
    { pressure: 988, rotation: 225.5 },
    { pressure: 989, rotation: 229.2 },
    { pressure: 990, rotation: 232.2 },
    { pressure: 991, rotation: 235.8 },
    { pressure: 992, rotation: 239 },
    { pressure: 993, rotation: 242.5 },
    { pressure: 994, rotation: 246 },
    { pressure: 995, rotation: 249.3 },
    { pressure: 996, rotation: 252.5 },
    { pressure: 997, rotation: 256 },
    { pressure: 998, rotation: 259.2 },
    { pressure: 999, rotation: 262.8 },
    { pressure: 1000, rotation: 266 },
    { pressure: 1001, rotation: 269.2 },
    { pressure: 1002, rotation: 273 },
    { pressure: 1003, rotation: 276 },
    { pressure: 1004, rotation: 279 },
    { pressure: 1005, rotation: 282.5 },
    { pressure: 1006, rotation: 285.9 },
    { pressure: 1007, rotation: 289.2 },
    { pressure: 1008, rotation: 293 },
    { pressure: 1009, rotation: 296 },
    { pressure: 1010, rotation: 299.2 },
    { pressure: 1011, rotation: 303 },
    { pressure: 1012, rotation: 306 },
    { pressure: 1013, rotation: 309.5 },
    { pressure: 1014, rotation: 312.8 },
    { pressure: 1015, rotation: 316.4 },
    { pressure: 1016, rotation: 319.8 },
    { pressure: 1017, rotation: 323 },
    { pressure: 1018, rotation: 326.7 },
    { pressure: 1019, rotation: 329.8 },
    { pressure: 1020, rotation: 333 },
    { pressure: 1021, rotation: 336.4 },
    { pressure: 1022, rotation: 339.8 },
    { pressure: 1023, rotation: 343 },
    { pressure: 1024, rotation: 346.8 },
    { pressure: 1025, rotation: 350 },
    { pressure: 1026, rotation: 353.4 },
    { pressure: 1027, rotation: 356.8 },
    { pressure: 1028, rotation: 360 },
    { pressure: 1029, rotation: 363.5 },
    { pressure: 1030, rotation: 367 },
    { pressure: 1031, rotation: 370.3 },
    { pressure: 1032, rotation: 374 },
    { pressure: 1033, rotation: 377.6 },
    { pressure: 1034, rotation: 380.7 },
    { pressure: 1035, rotation: 384 },
    { pressure: 1036, rotation: 387.8 },
    { pressure: 1037, rotation: 391 },
    { pressure: 1038, rotation: 394.8 },
    { pressure: 1039, rotation: 398 },
    { pressure: 1040, rotation: 401.5 },
    { pressure: 1041, rotation: 404.8 },
    { pressure: 1042, rotation: 408.3 },
    { pressure: 1043, rotation: 411.8 },
    { pressure: 1044, rotation: 415.3 },
    { pressure: 1045, rotation: 418.8 },
    { pressure: 1046, rotation: 422.3 },
    { pressure: 1047, rotation: 425.6 },
    { pressure: 1048, rotation: 429 },
    { pressure: 1049, rotation: 432.3 },
    { pressure: 1050, rotation: 436 },
    { pressure: 1051, rotation: 439.3 },
    { pressure: 1052, rotation: 442.7 },
    { pressure: 1053, rotation: 446.3 },
    { pressure: 1054, rotation: 449.6 },
    { pressure: 1055, rotation: 453 },
    { pressure: 1056, rotation: 456 },
    { pressure: 1057, rotation: 459.4 },
    { pressure: 1058, rotation: 463 },
  ];

  pressureData = Math.max(960, Math.min(1058, pressureData));
  for (const point of dataPoints) {
    if (point.pressure === pressureData) return point.rotation;
  }
  for (let i = 0; i < dataPoints.length - 1; i++) {
    if (pressureData >= dataPoints[i].pressure && pressureData <= dataPoints[i + 1].pressure) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];
      const ratio = (pressureData - p1.pressure) / (p2.pressure - p1.pressure);
      return p1.rotation + ratio * (p2.rotation - p1.rotation);
    }
  }
  return -149;
}

// Interpolation
export function interpolateData(data: WeatherDataPoint[], t: number): WeatherDataPoint {
  if (t >= 24) return data[data.length - 1];

  const times = data.map(d => {
    const date = new Date(d.time);
    return date.getHours() + date.getMinutes() / 60;
  });

  let i = 0;
  while (i < times.length - 1 && times[i + 1] <= t) i++;

  const t0 = times[i];
  const t1 = times[i + 1] ?? t0;
  const d0 = data[i];
  const d1 = data[i + 1] ?? data[i];

  const ratio = t1 === t0 ? 0 : (t - t0) / (t1 - t0);

  return {
    ...d0,
    tempMin: (parseFloat(d0.tempMin) + (parseFloat(d1.tempMin) - parseFloat(d0.tempMin)) * ratio).toFixed(1),
    tempMax: (parseFloat(d0.tempMax) + (parseFloat(d1.tempMax) - parseFloat(d0.tempMax)) * ratio).toFixed(1),
    pressure: (parseFloat(d0.pressure) + (parseFloat(d1.pressure) - parseFloat(d0.pressure)) * ratio).toFixed(0),
    humidity: (parseFloat(d0.humidity) + (parseFloat(d1.humidity) - parseFloat(d0.humidity)) * ratio).toFixed(0),
    windSpeed: (parseFloat(d0.windSpeed) + (parseFloat(d1.windSpeed) - parseFloat(d0.windSpeed)) * ratio).toFixed(2),
    windDeg: (parseFloat(d0.windDeg) + (parseFloat(d1.windDeg) - parseFloat(d0.windDeg)) * ratio).toFixed(0),
  };
}


