import Config from "./interfaces/config";
import SensorUtil from "./util/sensorUtil";
import WeatherUtil from "./util/weatherUtil";
import webRouter from "./webRouter";

export default class PRICE {

    sensorUtil: SensorUtil;
    weatherUtil: WeatherUtil;
    webRouter: webRouter;

    isDevelopmentMode: boolean = (process.argv.slice(2).includes("--development"));
    config: Config;

    constructor() {
        this.config = require(`${process.cwd()}/data/config.json`);
        this.sensorUtil = new SensorUtil(this);
        this.webRouter = new webRouter(this);
        this.weatherUtil = new WeatherUtil(this);
    }

}