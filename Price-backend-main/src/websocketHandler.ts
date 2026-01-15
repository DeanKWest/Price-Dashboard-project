import { WebSocketServer, WebSocket } from 'ws';
import PRICE from './PRICE';
export default class WebSocketHandler {

    private wss: WebSocketServer;
    private PRICE: PRICE;

    private PhoneControlPin: string = '0'; // Pin voor telefoonbediening, standaard op 0

    constructor(PRICE: PRICE, wss: WebSocketServer) {
        this.PRICE = PRICE;
        this.wss = wss;
        this.PhoneControlPin = this.PRICE.config.phoneControlPin;
        this.init();
    }

    private init(): void {
        this.wss.on('connection', (ws) => {
            if (this.PRICE.isDevelopmentMode) console.log('Nieuwe WebSocket verbinding');

            ws.on('message', (message) => this.handleMessage(ws, message.toString()));

            ws.on('close', () => {
                if (this.PRICE.isDevelopmentMode) console.log('WebSocket verbinding gesloten');
            });
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket fout:', error);
        });
    }

    private handleMessage(ws: WebSocket, message: string): void {

        const send_to_mainpage = ['switchPage', 'clickButton', 'switchTimeRange']

        try {
            const data = JSON.parse(message);
            if (this.PRICE.isDevelopmentMode) console.log('Parsed message:', data);
            if (data.type === 'identify' && data.name) {

                if (data.name === 'phoneController') {
                    if (data.pin && data.pin === this.PhoneControlPin) {
                        (ws as any).name = data.name;
                        ws.send(JSON.stringify({ type: 'identified', name: data.name }));
                    } else {
                        ws.send(JSON.stringify({ error: 'Invalid pin for phone controller' }));
                    }

                } else {
                    (ws as any).name = data.name;
                    ws.send(JSON.stringify({ type: 'identified', name: data.name }));
                }
            }

            else if (data.type === 'toggleSlideshow') {
                if ((ws as any).name === 'phoneController') {
                    this.sendToMainPage({ type: 'toggleSlideshow' });
                } else {
                    ws.send(JSON.stringify({ error: 'Unauthorized action' }));
                }
            }

            else if (send_to_mainpage.includes(data.type)) {
                if ((ws as any).name === 'phoneController') {
                    this.sendToMainPage(data)
                } else {
                    ws.send(JSON.stringify({ error: 'Unauthorized action' }));
                }
            }

            
            

        } catch (error) {
            console.error('Fout bij verwerken bericht:', error);
            ws.send(JSON.stringify({ error: 'Invalid message received', message: message }));
        }
    }

    public sendToMainPage(data: Object): void {
        this.wss.clients.forEach((client: any) => {
            if (client.name === 'mainPage' && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

}