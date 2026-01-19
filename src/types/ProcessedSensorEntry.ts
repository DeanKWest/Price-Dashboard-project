type ProcessedSensorEntry = {
  id: number;
  created_at: number;
  sensor_name: string;
  temperature_1: number;
  temperature_2: number;
  temperature_3: number;
  humidity_1: number;
  humidity_2: number;
  humidity_3: number;
}

export default ProcessedSensorEntry;