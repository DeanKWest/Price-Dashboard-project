import path from "path";
import PRICE from "../PRICE";
import axios from "axios";
import fs from "fs";
import SensorData from "../types/sensorData";
import ProcessedSensorEntry from "../types/ProcessedSensorEntry";
import SustainabilityData from "../types/SustainabilityData";

const materialsFile = path.resolve(__dirname, '../../data/materials.json');
interface RawMaterial {
    name: string;
    scores: number[];
    descriptions: string[];
}
const materialsData: Record<string, RawMaterial> = JSON.parse(
    fs.readFileSync(materialsFile, 'utf-8')
);

type sensorData = {
    id: number
    created_at: number
    sensor_name: string
    humidity_1: string
    temperature_1: string
    humidity_2: string
    temperature_2: string
    humidity_3: string
    temperature_3: string
}

export default class SensorUtil {

    private PRICE: PRICE;
    private token: string | null = null;
    private sensorData: sensorData[] | undefined = undefined;

    constructor(PRICE: PRICE) {
        this.PRICE = PRICE;
        this.init();
        this.initLoop();
    }

    async init() {
        this.sensorData = await this.readSensorDataFromFile().catch(() => { return undefined }); // Catchen zodat we verder kunnen gaan als het bestand niet bestaat
    }

    private initLoop() {
        const _loop = setInterval(() => {
            this.updateSensorData();
        }, this.PRICE.config.xano.refreshInterval);

        // Eerste keer aangezien setInterval pas na de eerste interval begint
        this.updateSensorData();
    }

    private updateSensorData() {
        this.fetchSensorData().catch(() => {
            this.refreshToken().then(() => {
                this.fetchSensorData().catch((error) => {
                    console.error('Fout bij ophalen van sensor data:', error);
                });
            });
        });
    }

    private async fetchSensorData() {
        return new Promise<void>(async (resolve, reject) => {

            if (this.PRICE.isDevelopmentMode) console.log('Sensor data ophalen...');

            if (!this.token) {
                reject('Geen token beschikbaar');
                return;
            }

            const SENSOR_API_URL = this.PRICE.config.xano.baseUrl + this.PRICE.config.xano.sensorApiUrl;

            let current = 1;
            const limitPerPage = 20000;
            let completeData: any[] = [];

            while (true) {
                if( this.PRICE.isDevelopmentMode) console.log(`Ophalen pagina ${current} van sensor data...`);
                const response = await axios.get(SENSOR_API_URL + `?paging=${current}&PerPage=${limitPerPage}`, {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: 'application/json',
                    },
                }).catch((error) => {
                    reject(error);
                    return;
                });

                if (!response || !response.data) {
                    reject('Geen sensor data ontvangen');
                    return;
                }

                const data = response.data;
                completeData = completeData.concat(data.items);
                
                if (data.nextPage && data.nextPage !== null) {
                    current++;
                }
                else {
                    if (this.PRICE.isDevelopmentMode) console.log('Alle sensor data opgehaald');
                    break;
                }
            }

            // Filter de sensor data op basis van de sensorId
            this.sensorData = completeData.sort((a: any, b: any) => a.id - b.id);

            // Haal alle entries met 999 999 999 eruit
            this.sensorData = this.sensorData!.filter(
                (sensor: sensorData) =>
                    sensor.humidity_1 !== '999.00'
                    && sensor.temperature_1 !== '999.00'
                    && sensor.humidity_2 !== '999.00'
                    && sensor.temperature_2 !== '999.00'
                    && sensor.humidity_3 !== '999.00'
                    && sensor.temperature_3 !== '999.00'
                    && sensor.humidity_1 !== '999'
                    && sensor.temperature_1 !== '999'
                    && sensor.humidity_2 !== '999'
                    && sensor.temperature_2 !== '999'
                    && sensor.humidity_3 !== '999'
                    && sensor.temperature_3 !== '999'
            );

            this.writeSensorDataToFile();

            resolve();

        });
    }

    private async refreshToken() {
        return new Promise<void>(async (resolve, reject) => {

            if (this.PRICE.isDevelopmentMode) console.log('Inloggen...');

            const LOGIN_URL = this.PRICE.config.xano.baseUrl + this.PRICE.config.xano.loginUrl;

            const response = await axios.post(LOGIN_URL, {
                email: this.PRICE.config.xano.user,
                password: this.PRICE.config.xano.pass,
            }).catch((error) => {
                reject(error);
                return;
            });

            if (!response || !response.data || !response.data.authToken) {
                reject('Geen token ontvangen');
            }

            const token = response!.data.authToken;
            this.token = token;
            resolve();
        });
    }

    private async writeSensorDataToFile() {

        // Check of de file bestaat
        if (!fs.existsSync(path.join(__dirname, '/data'))) {
            fs.mkdirSync(path.join(__dirname, '/data'));
        }

        fs.writeFileSync(path.join(__dirname, '../../data/sensorData.json'), JSON.stringify(this.sensorData, null, 2));

        if (this.PRICE.isDevelopmentMode) console.log('Sensor data naar bestand geschreven');
    }

    private async readSensorDataFromFile(): Promise<sensorData[]> {
        return new Promise((resolve, reject) => {
            const filePath = path.join(__dirname, '../../data/sensorData.json');
            if (!fs.existsSync(filePath)) {
                reject('Bestand bestaat niet');
                return;
            }

            const fileData = fs.readFileSync(filePath, 'utf8');
            const sensorData = JSON.parse(fileData);

            if (this.PRICE.isDevelopmentMode) console.log('Sensor data uit bestand gelezen');
            resolve(sensorData)
        });
    }



    getSensorData() {
        if (!this.sensorData) {
            return [];
        }
        return this.sensorData;
    }

    getSensorTitle(id: number): string {
        const titles = ['Huistemperatuur', 'Hemkoor', 'Stro', 'Cellulose', 'Isovlas'];
        return titles[id] || `Sensor ${id}`;
    }

    downsampleData(data: SensorData[], intervalH: number): SensorData[] {
        const ms = intervalH * 3600 * 1000;
        const out: SensorData[] = [];
        let next = data[0]?.created_at;
        for (const d of data) {
            if (d.created_at >= next!) {
                out.push(d);
                next = d.created_at + ms;
            }
        }
        return out;
    }

    lowerBoundByTime(arr: SensorData[], ts: number): number {
        let lo = 0, hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid].created_at < ts) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    processEntry(e: SensorData): ProcessedSensorEntry {
        const p: ProcessedSensorEntry = {
            id: e.id,
            created_at: e.created_at,
            sensor_name: e.sensor_name,
            temperature_1: Number(e.temperature_1),
            temperature_2: Number(e.temperature_2),
            temperature_3: Number(e.temperature_3),
            humidity_1: Number(e.humidity_1),
            humidity_2: Number(e.humidity_2),
            humidity_3: Number(e.humidity_3)
        };
        if (!this.isValidTemperature(p)) throw new Error('Invalid temp');
        return p;
    }

    isValidTemperature(e: ProcessedSensorEntry): boolean {
        return [e.temperature_1, e.temperature_2, e.temperature_3]
            .every(t => t >= -10 && t <= 60);
    }

    async getSustainabilityData(sensorId: string, lang: any): Promise<SustainabilityData> {
        const mat = materialsData[sensorId] || materialsData['0'];
        return {
            labels: [
                lang.sensor.chart.impact,
                lang.sensor.chart.co2_emissions,
                lang.sensor.chart.co2_holding,
                lang.sensor.chart.biobased,
                lang.sensor.chart.recyclability,
                lang.sensor.chart.reuseability,
                lang.sensor.chart.health_impact,
                lang.sensor.chart.geolocation,
            ],
            materialName: mat.name,
            datasets: [{
                label: 'Sustainability Scores',
                data: mat.scores,
                backgroundColor: 'rgba(75,192,192,0.2)',
                borderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: 'rgba(75,192,192,1)',
                borderWidth: 2
            }],
            descriptions: mat.descriptions
        };
    }

}