type SustainabilityData = {
  labels: string[];
  materialName: string;
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    pointBackgroundColor: string;
    borderWidth: number;
  }>;
  descriptions: string[];
}

export default SustainabilityData;