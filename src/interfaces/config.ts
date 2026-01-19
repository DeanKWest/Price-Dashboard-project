export default interface Config {
    port: number;
    weatherUpdateInterval: number;
    weatherApiKey: string;
    xano: {
        refreshInterval: number;
        baseUrl: string;
        loginUrl: string;
        sensorApiUrl: string;
        user: string;
        pass: string;
    };
    phoneControlPin: string;
    localIp: string;
}