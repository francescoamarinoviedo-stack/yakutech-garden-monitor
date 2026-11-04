/*
 * Monitoreg — Firmware de referencia para Arduino UNO
 * ---------------------------------------------------
 * Jardín vertical con módulo Bluetooth HC-05 / HC-06 (puente serie BLE UART).
 *
 * Protocolo serie (una línea por mensaje, terminada en '\n'):
 *
 *   Comandos recibidos desde la app:
 *     READ            -> envía una trama de medición
 *     PUMP:1 / PUMP:0 -> activa / desactiva la bomba
 *     VALVE:1 / VALVE:0 -> activa / desactiva la electroválvula
 *     STOP            -> detiene bomba y electroválvula
 *     THRESH:<n>      -> fija el umbral de humedad (0-100 %)
 *     MAXDUR:<n>      -> fija la duración máxima de riego (segundos)
 *
 *   Tramas enviadas a la app:
 *     SOIL:<n>,TEMP:<n>,HUM:<n>
 *     (cualquier campo puede omitirse si el sensor no está presente)
 *
 * Seguridad: la bomba y la electroválvula nunca se activan a la vez.
 * Conexión: el módulo HC-05/HC-06 se conecta a los pines 0 (RX) y 1 (TX).
 * Desconecta el módulo al cargar el sketch para evitar conflictos de puerto.
 */

#include <SoftwareSerial.h>

// HC-05/HC-06 en pines digitales 10 (RX) y 11 (TX).
SoftwareSerial bluetooth(10, 11);

// --- Pines de hardware -----------------------------------------------------
const uint8_t PIN_SOIL = A0;   // Sensor capacitivo de humedad del suelo
const uint8_t PIN_TEMP = A1;   // Sensor de temperatura (p. ej. LM35)
const uint8_t PIN_HUM = A2;    // Sensor de humedad ambiental (p. ej. DHT)
const uint8_t PIN_PUMP = 7;    // Relé de la bomba
const uint8_t PIN_VALVE = 8;   // Relé de la electroválvula

// --- Estado ----------------------------------------------------------------
int moistureThreshold = 40;    // % de humedad por debajo del cual se riega
unsigned long maxDurationMs = 60000; // duración máxima de riego (ms)
unsigned long irrigationStart = 0;
bool irrigating = false;

String commandBuffer = "";

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600);

  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_VALVE, OUTPUT);
  digitalWrite(PIN_PUMP, LOW);
  digitalWrite(PIN_VALVE, LOW);

  bluetooth.println(F("READY"));
}

void loop() {
  readBluetooth();

  // Protección contra riego excesivo.
  if (irrigating && millis() - irrigationStart > maxDurationMs) {
    stopIrrigation();
    bluetooth.println(F("MAXDUR_REACHED"));
  }
}

// Lee comandos del módulo Bluetooth y los ejecuta.
void readBluetooth() {
  while (bluetooth.available() > 0) {
    char c = (char)bluetooth.read();
    if (c == '\n') {
      handleCommand(commandBuffer);
      commandBuffer = "";
    } else if (c != '\r') {
      commandBuffer += c;
    }
  }
}

void handleCommand(const String &raw) {
  String cmd = raw;
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd == "READ") {
    sendMeasurement();
  } else if (cmd == "STOP") {
    stopIrrigation();
  } else if (cmd.startsWith("PUMP:")) {
    setActuator(PIN_PUMP, cmd.substring(5).toInt() == 1);
  } else if (cmd.startsWith("VALVE:")) {
    setActuator(PIN_VALVE, cmd.substring(6).toInt() == 1);
  } else if (cmd.startsWith("THRESH:")) {
    moistureThreshold = constrain(cmd.substring(7).toInt(), 0, 100);
  } else if (cmd.startsWith("MAXDUR:")) {
    maxDurationMs = (unsigned long)cmd.substring(7).toInt() * 1000UL;
  }
}

// Activa un relé garantizando que bomba y electroválvula no coincidan.
void setActuator(uint8_t pin, bool on) {
  if (on) {
    digitalWrite(PIN_PUMP, LOW);
    digitalWrite(PIN_VALVE, LOW);
    digitalWrite(pin, HIGH);
    if (!irrigating) {
      irrigating = true;
      irrigationStart = millis();
    }
  } else {
    digitalWrite(pin, LOW);
    if (digitalRead(PIN_PUMP) == LOW && digitalRead(PIN_VALVE) == LOW) {
      irrigating = false;
    }
  }
}

void stopIrrigation() {
  digitalWrite(PIN_PUMP, LOW);
  digitalWrite(PIN_VALVE, LOW);
  irrigating = false;
}

// Lee los sensores y envía una trama SOIL/TEMP/HUM.
void sendMeasurement() {
  int soil = map(analogRead(PIN_SOIL), 0, 1023, 100, 0);
  int rawTemp = analogRead(PIN_TEMP);
  int temperature = (rawTemp * 500L) / 1023L; // LM35: 10 mV por °C
  int humidity = map(analogRead(PIN_HUM), 0, 1023, 0, 100);

  bluetooth.print(F("SOIL:"));
  bluetooth.print(soil);
  bluetooth.print(F(",TEMP:"));
  bluetooth.print(temperature);
  bluetooth.print(F(",HUM:"));
  bluetooth.println(humidity);
}
