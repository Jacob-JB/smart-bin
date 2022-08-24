#include <Arduino.h>

// gps
#include <SoftwareSerial.h>
#include <FuGPS.h>

// wifi
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

// power saving
#include <ESP.h>

// EEPROM
#include <EEPROM.h>
const int readNum = 1;

// gps
SoftwareSerial hwdSerial;

FuGPS fuGPS(hwdSerial);

char fixMode = '0';

String lattitude;
String lattitudeDirection;
String longitude;
String longitudeDirection;
String sattelites;
String mode;

// wifi
#ifndef STASSID
#define STASSID "Jacob"
#define STAPSK  "hihihiih"
#endif

#define trigPin 12
#define echoPin 14

const char* ssid     = STASSID;
const char* password = STAPSK;

const char* host = "192.168.29.84";
const uint16_t port = 3000;
String myMac;


String HTTPReqData;
String HTTPReq;
String inLine;

int    optionPos;
String optionValue;

byte mac[6]; // the MAC address of the Wifi shield


ESP8266WiFiMulti WiFiMulti;


void setup() {
  Serial.begin(9600);
  Serial.println("\n\nSerial started");

  hwdSerial.begin(9600,SWSERIAL_8N1,5,4,false);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  Serial.println("Listening to GPS");
}

void loop() {
  // gps

  //Check to see if anything is available in the serial receive buffer
  if (fuGPS.read()) {
    //Serial.println("reading from gps");

    String sentence;

    byte tokenIdx = 0;
    while (const char* token = fuGPS.getField(tokenIdx++)) {
      //Serial.print("Token [" + String(tokenIdx) + "]: ");
      //Serial.println(token);

      if (tokenIdx == 1) {
        sentence = token;
      }

      if (sentence == "GPGSA") {
        switch (tokenIdx) {
          case 3:
            fixMode = *token;
            Serial.print("Mode: ");
            Serial.println(fixMode);

            mode = String(token);
            break;
        }
      }
      else if ((sentence == "GPGGA") && (fixMode == *"3")) {
        switch (tokenIdx) {
          case 3:
            lattitude = String(token);
            break;
          case 4:
            lattitudeDirection = String(token);
            break;
          case 5:
            longitude = String(token);
            break;
          case 6:
            longitudeDirection = String(token);
            break;
        }
      }
      else if (sentence == "GPGSV") {
        switch (tokenIdx) {
          case 4:
            sattelites = String(token);
            break;
        }
      }
    }

    if (sentence == "GPGGA") {

      EEPROM.begin(readNum + 1);
      int measureStage = EEPROM.read(0);

      if (fixMode == '3') {
        Serial.println("gps lock");

        Serial.print("lattitude is ");
        Serial.print(lattitude);
        Serial.println(lattitudeDirection);

        Serial.print("longitude is ");
        Serial.print(longitude);
        Serial.println(longitudeDirection);

        Serial.print("measuring stage ");
        Serial.println(measureStage);
        if (measureStage < readNum) {
          measureStage ++;

          //measure distance
          digitalWrite(trigPin, LOW);
          delayMicroseconds(2);
          digitalWrite(trigPin, HIGH);
          delayMicroseconds(10);
          digitalWrite(trigPin, LOW);
          int distance = (pulseIn(echoPin, HIGH)/2) / 29.1;
          Serial.print("measured ");
          Serial.println(distance);

          EEPROM.write(measureStage, distance);

        }

        if (measureStage >= readNum) {
          measureStage = 0;

          connectToWifi();

          int attempts = 0;
          while (!logDataToServer()) {
            if (attempts >= 5) {
              Serial.println("failed to log to server");
              break;
            } else {
              Serial.println("retrying");
              attempts ++;
            }
          }
        }

        EEPROM.write(0, measureStage);
        EEPROM.commit();

      } else if (fixMode == '1') {
        EEPROM.write(0, 0);
        EEPROM.commit();
        Serial.println("no gps lock");
      }
      if (fixMode != '0') {
        Serial.println("sleeping for 5 seconds...zzz");
        ESP.deepSleep(5e6, measureStage == readNum - 2 ? WAKE_RFCAL : WAKE_NO_RFCAL);
      }
    }
  }


  // wifi
  //logDataToServer();

  yield();
}

void connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFiMulti.addAP(ssid, password);

  Serial.print("Connecting to WiFi...");

  while (WiFiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println(" WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}


bool logDataToServer() {
  Serial.println("logging data to server");
  Serial.print("connecting to ");
  Serial.print(host);
  Serial.print(':');
  Serial.println(port);

  // Use WiFiClient class to create TCP connections
  WiFiClient client;

  if (!client.connect(host, port)) {
    Serial.println("connection failed, not logging");
    return false;
  }

  // get mac address
  WiFi.macAddress(mac);

  myMac = "";
  myMac.concat(String(mac[0], HEX));
  myMac.concat(String(mac[1], HEX));
  myMac.concat(String(mac[2], HEX));
  myMac.concat(String(mac[3], HEX));
  myMac.concat(String(mac[4], HEX));
  myMac.concat(String(mac[5], HEX));
  myMac.toUpperCase();
  //Serial.print("this mac address: ");
  //Serial.println(myMac);

  //build data string to send to server
  HTTPReqData = "Lat=";
  HTTPReqData.concat(lattitude);
  HTTPReqData.concat(lattitudeDirection);
  HTTPReqData.concat("&Lon=");
  HTTPReqData.concat(longitude);
  HTTPReqData.concat(longitudeDirection);
  HTTPReqData.concat("&MAC=");
  HTTPReqData.concat(myMac);
  HTTPReqData.concat("&Len=");
  HTTPReqData.concat(readNum);
  for (int i = 0; i < readNum; i++) {
    HTTPReqData.concat("&Depth");
    HTTPReqData.concat(i);
    HTTPReqData.concat("=");
    HTTPReqData.concat(String(EEPROM.read(i + 1), 10));
  }
  //HTTPReqData.concat(String(distance, 10));

  // make http request
  client.println("POST / HTTP/1.1");
  client.println("Connection: close");
  client.println("Keep-Alive: timeout=0");
  client.println("User-Agent: HTTP_Bin/1.0");
  client.println("Content-Type: application/x-www-form-urlencoded");
  client.print("Content-Length: ");
  client.println(HTTPReqData.length());
  client.println("");

  client.print(HTTPReqData);

  client.println("");
  client.println("");


  //read back one line from server
  //Serial.print("receiving from remote server... ");
  //inLine = client.readString();
  //Serial.println(inLine);

  //optionPos=inLine.indexOf('LOOPDELAY=');
  //optionValue=inLine.substring(optionPos+5,optionPos+15);


  //Serial.print("Option=");
  //Serial.println(inLine.substring(optionPos+10,optionPos+15));


  //Serial.println("closing connection\n");

  client.stop();

  return true;
}
