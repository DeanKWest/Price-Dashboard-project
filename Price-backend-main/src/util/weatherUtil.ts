import path from "path";
import PRICE from "../PRICE";
import axios from "axios";
import fs from "fs";

export default class WeatherUtil {
  private PRICE: PRICE;
  private weatherData: any;

  constructor(PRICE: PRICE) {
    this.PRICE = PRICE;
    this.readWeatherDataFromFile().catch(() => {
      if (this.PRICE.isDevelopmentMode) {
        console.warn("⚠️ Geen bestaande weerdata gevonden bij opstart.");
      }
    });
    this.initLoop();
  }

  private initLoop() {
    // Start interval voor weerdata verversen
    setInterval(() => {
      this.updateWeatherData();
    }, this.PRICE.config.weatherUpdateInterval);

    // Voer meteen uit bij start
    this.updateWeatherData();
  }

  private updateWeatherData() {
    this.fetchWeatherData().catch((err) => {
      if (this.PRICE.isDevelopmentMode) {
        console.warn("⚠️ Ophalen van weerdata mislukt:", err?.message || err);
      }
    });
  }

  private async fetchWeatherData(): Promise<void> {
    if (this.PRICE.isDevelopmentMode) {
      console.log("🔄 Weerdata ophalen op:", new Date().toLocaleTimeString());
    }

    const url = `https://api.weatherapi.com/v1/current.json?key=${this.PRICE.config.weatherApiKey}&q=Almere`;

    try {
      const response = await axios.get(url);

      if (!response?.data) {
        throw new Error("Geen data in response");
      }

      this.weatherData = response.data;
      await this.writeWeatherDataToFile();

      if (this.PRICE.isDevelopmentMode) {
        console.log("✅ Weerdata succesvol opgehaald en opgeslagen.");
      }
    } catch (err: any) {
      if (this.PRICE.isDevelopmentMode) {
        console.error("❌ Fout bij ophalen van weerdata:", err.message);
      }
      throw err;
    }
  }

  private async writeWeatherDataToFile(): Promise<void> {
    const dataPath = path.join(__dirname, "../../data");

    // Maak de map aan als deze nog niet bestaat
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath);
    }

    const filePath = path.join(dataPath, "weatherData.json");
    fs.writeFileSync(filePath, JSON.stringify(this.weatherData, null, 2));

    if (this.PRICE.isDevelopmentMode) {
      console.log("💾 Weerdata opgeslagen in weatherData.json");
    }
  }

  private async readWeatherDataFromFile(): Promise<void> {
    const filePath = path.join(__dirname, "../../data/weatherData.json");

    if (!fs.existsSync(filePath)) {
      throw new Error("⚠️ weatherData.json bestaat nog niet");
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    this.weatherData = JSON.parse(fileData);

    if (this.PRICE.isDevelopmentMode) {
      console.log("📂 Weerdata geladen uit lokaal bestand");
    }
  }

  public getWeatherData() {
    return this.weatherData;
  }
}
