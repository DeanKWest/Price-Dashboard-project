import express from 'express';
import cors from 'cors';
import PRICE from './PRICE';
import SensorData from './types/sensorData';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import { getLanguage } from './util/languageUtil';
import ProcessedSensorEntry from './types/ProcessedSensorEntry';
import SustainabilityData from './types/SustainabilityData';
import WebSocketHandler from './websocketHandler';

export default class webRouter {
  private app: express.Application;
  private PRICE: PRICE;
  private wss: WebSocketServer;
  private wsHandler: WebSocketHandler;

  constructor(PRICE: PRICE) {
    this.PRICE = PRICE;
    this.app = express();
    this.init();

    const server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server });

    // WebSocket handler
    this.wsHandler = new WebSocketHandler(this.PRICE, this.wss);

    server.listen(this.PRICE.config.port + 1, () => {
      if (this.PRICE.isDevelopmentMode) {
        console.log(`WebSocket server running on ws://localhost:${this.PRICE.config.port + 1}`);
      }
    });

  }

  private init(): void {
    this.app.use(cors());
    this.app.set('view engine', 'ejs');
    this.app.use(express.static('public'));
    this.app.use(express.json());

    this.app.get('/', async (req, res) => {
      res.redirect('/nl');
    });

    this.app.get('/home/:lang', (req, res) => {
      res.render('home')
    });

    this.app.get('/lang/:lang', async (req, res) => {
      const langValues = await getLanguage(req.params.lang)
      res.json(langValues);
    });

    // Sensor‐pagina's
    this.app.get('/sensors/:id/:lang', async (req, res) => {
      if ([0, 1, 2, 3, 4].includes(parseInt(req.params.id, 10)) === false) {
        res.status(404).send('404');
        return;
      }

      const id = parseInt(req.params.id, 10);
      const langValues = await getLanguage(req.params.lang);

      res.render('sensor.ejs', {
        title: this.PRICE.sensorUtil.getSensorTitle(id),
        sensorId: id,
        language: langValues
      });
    });

    // Compare‐pagina
    this.app.get('/compare/:lang', async (req, res) => {
      const langValues = await getLanguage(req.params.lang)
      res.render('compare.ejs', { title: 'Sensor Comparison', sensorCount: 5, language: langValues })
    }
    );

    // API: WebSocket URL
    this.app.get('/api/websocket-url', (req, res) => {
      const url = `ws://${this.PRICE.config.localIp}:${this.PRICE.config.port + 1}`;
      res.json({ url });
    });

    // API: alle sensordata
    this.app.get('/api/sensors', async (req, res) => {
      try {
        const data = this.PRICE.sensorUtil.getSensorData();
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sensor data' });
      }
    });

    // API: historie per sensor
    this.app.get(
      '/api/sensors/:id/history',
      async (
        req: any,
        res: any
      ) => {
        try {
          const sensorId = parseInt(req.params.id, 10);
          if (isNaN(sensorId)) return res.status(400).json({ error: 'Invalid sensor ID' });

          const hours = parseInt(req.query.hours as string, 10) || 24;
          const threshold = Date.now() - hours * 3600 * 1000;
          const all = await this.PRICE.sensorUtil.getSensorData();
          const start = this.PRICE.sensorUtil.lowerBoundByTime(all, threshold);

          let entries = all.slice(start).filter(e => e.sensor_name === `Sensor${sensorId}`);
          if (hours >= 168) {
            const interval = hours >= 8760 ? 24 : hours >= 720 ? 6 : 1;
            entries = this.PRICE.sensorUtil.downsampleData(entries, interval);
          }

          const processed: ProcessedSensorEntry[] = entries
            .map(e => {
              try { return this.PRICE.sensorUtil.processEntry(e); }
              catch { return null; }
            })
            .filter((e): e is ProcessedSensorEntry => e !== null);

          if (!processed.length) {
            return res.json({ labels: [], temperatures: [[], [], []], humidities: [[], [], []] });
          }

          res.json({
            labels: processed.map(d => new Date(d.created_at)),
            temperatures: [
              processed.map(d => d.temperature_1),
              processed.map(d => d.temperature_2),
              processed.map(d => d.temperature_3)
            ],
            humidities: [
              processed.map(d => d.humidity_1),
              processed.map(d => d.humidity_2),
              processed.map(d => d.humidity_3)
            ]
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to get sensor history' });
        }
      });

    // API: sustainability per sensor
    this.app.get('/api/sensors/:id/sustainability/:lang', async (req, res) => {
      const langValues = await getLanguage(req.params.lang)
      try {
        const data = await this.PRICE.sensorUtil.getSustainabilityData(req.params.id, langValues);
        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get sustainability data' });
      }
    });

    // API: weer
    this.app.get('/api/weather', async (req, res) => {
      try {
        const w = await this.PRICE.weatherUtil.getWeatherData();
        res.json(w);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weather data' });
      }
    });

    // API: vergelijking
    this.app.get('/api/sensors/comparison', async (req, res) => {
      try {
        const hours = parseInt(req.query.hours as string, 10) || 24;
        const threshold = Date.now() - hours * 3600 * 1000;
        const all = await this.PRICE.sensorUtil.getSensorData();

        const sensors = [0, 1, 2, 3, 4].map(id => {
          const raw = all
            .filter(e => e.sensor_name === `Sensor${id}` && e.created_at >= threshold)
            .map(e => this.PRICE.sensorUtil.processEntry(e));

          if (!raw.length) return { sensorId: id, avgTemperature: null, avgHumidity: null };

          const avgTemp = raw.reduce((sum, e) =>
            sum + e.temperature_1 + e.temperature_2 + e.temperature_3, 0
          ) / (raw.length * 3);

          const avgHum = raw.reduce((sum, e) =>
            sum + e.humidity_1 + e.humidity_2 + e.humidity_3, 0
          ) / (raw.length * 3);

          return {
            sensorId: id,
            avgTemperature: parseFloat(avgTemp.toFixed(2)),
            avgHumidity: parseFloat(avgHum.toFixed(2)),
            sensorName: this.PRICE.sensorUtil.getSensorTitle(id)
          };
        });

        res.json({ sensors });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get comparison data' });
      }
    });

    // Homepage
    this.app.get('/:lang', async (req, res) => {
      const lang = req.params.lang;
      if (!/^[a-z]{2}$/.test(lang)) {
        res.status(404).send('Invalid language');
        return;
      }

      const langValues = await getLanguage(lang);
      res.render('index.ejs', { language: langValues });
    });

    this.app.post('/event', async (req, res) => {
      
      if(!req.body) {
        res.status(400).json({message: 'Missing body'});
        return;
      }
    
      const { type, pin } = req.body;

      if(!type || !pin) {
        res.status(400).send('Missing params')
        return;
      }

      switch(type) {
        case "checkAuth":
          const valid = (pin === this.PRICE.config.phoneControlPin);
          res.status(200).json({
            success: valid,
            message: valid ? 'Authorized' : 'Unauthorized'
          });
          break;
        case "toggleSlideshow":
          if (pin === this.PRICE.config.phoneControlPin) {
            this.wsHandler.sendToMainPage({ type: 'toggleSlideshow' });
            res.status(200).json({ success: true, message: 'Slideshow toggled' });
          } else {
            res.status(403).json({ success: false, message: 'Unauthorized' });
          }
          break;
        case "switchPage":
          if (pin === this.PRICE.config.phoneControlPin) {
            const path = req.body.path;
            if (!path) {
              res.status(400).send('Missing page parameter');
              return;
            }
            this.wsHandler.sendToMainPage({ type: 'switchPage', path });
            res.status(200).json({ success: true, message: `Switched to page ${path}` });
          } else {
            res.status(403).json({ success: false, message: 'Unauthorized' });
          }
          break;
        case "clickButton":
          if (pin === this.PRICE.config.phoneControlPin) {
            const buttonId = req.body.buttonId;
            if (!buttonId) {
              res.status(400).send('Missing button parameter');
              return;
            }
            this.wsHandler.sendToMainPage({ type: 'clickButton', buttonId });
            res.status(200).json({ success: true, message: `Button ${buttonId} clicked` });
          } else {
            res.status(403).json({ success: false, message: 'Unauthorized' });
          }
          break;
        case "switchTimeRange":
          if (pin === this.PRICE.config.phoneControlPin) {
            const hours = req.body.hours;
            if (!hours) {
              res.status(400).send('Missing range parameter');
              return;
            }
            this.wsHandler.sendToMainPage({ type: 'switchTimeRange', hours });
            res.status(200).json({ success: true, message: `Switched time range to ${hours}` });
          } else {
            res.status(403).json({ success: false, message: 'Unauthorized' });
          }
          break;
      }

    })

    // 404 + start server
    this.app.all('*url', (req, res) => {
      res.status(404).send('404');
      return;
    });

    this.app.listen(this.PRICE.config.port, '0.0.0.0', () => {
      if (this.PRICE.isDevelopmentMode) {
        console.log(`Server on http://localhost:${this.PRICE.config.port}`);
      }
    });
  }
}