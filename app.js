const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";
const sensorTopic = "wokwi/esp32/sensors_data_jp";
const controlTopic = "wokwi/esp32/control_jp";
const clientId = "WebCtrl_JP_" + Math.random().toString(16).substring(2, 8);

const statusEl = document.getElementById("connection-status");
const tempEl = document.getElementById("temp-val");
const humEl = document.getElementById("hum-val");
const distEl = document.getElementById("dist-val");
const servoBadgeEl = document.getElementById("servo-badge");
const servoAngleEl = document.getElementById("servo-angle");
const modeLabelEl = document.getElementById("mode-label");

let currentMotorMode = "AUTO";

const client = mqtt.connect(brokerUrl, {
  clientId: clientId,
  clean: true,
  reconnectPeriod: 3000
});

client.on("connect", () => {
  statusEl.textContent = "Connected to HiveMQ";
  statusEl.className = "status connected";
  client.subscribe(sensorTopic);
});

client.on("disconnect", () => {
  statusEl.textContent = "Disconnected";
  statusEl.className = "status disconnected";
});

// Receive live sensor telemetry and alert status
client.on("message", (topic, message) => {
  if (topic === sensorTopic) {
    try {
      const data = JSON.parse(message.toString());

      tempEl.textContent = data.temperature_c.toFixed(1);
      humEl.textContent = data.humidity_pct.toFixed(1);
      distEl.textContent = data.distance_cm.toFixed(1);
      servoAngleEl.textContent = data.servo_angle;
      modeLabelEl.textContent = data.motor_mode;

      // Update Temperature Alert UI
      const tempCard = document.getElementById("card-temp");
      const tempAlertEl = document.getElementById("temp-alert-msg");
      if (data.temp_alert) {
        tempCard.classList.add("alert-border");
        tempAlertEl.textContent = "HIGH TEMP ALERT";
        tempAlertEl.className = "alert-tag danger";
      } else {
        tempCard.classList.remove("alert-border");
        tempAlertEl.textContent = "Normal";
        tempAlertEl.className = "alert-tag normal";
      }

      // Update Humidity Alert UI
      const humCard = document.getElementById("card-hum");
      const humAlertEl = document.getElementById("hum-alert-msg");
      if (data.hum_alert) {
        humCard.classList.add("alert-border");
        humAlertEl.textContent = "HIGH HUMIDITY ALERT";
        humAlertEl.className = "alert-tag danger";
      } else {
        humCard.classList.remove("alert-border");
        humAlertEl.textContent = "Normal";
        humAlertEl.className = "alert-tag normal";
      }

      // Update Servo Status Badge
      if (data.servo_status === "ROTATING") {
        servoBadgeEl.textContent = "ROTATING";
        servoBadgeEl.className = "badge rotating";
      } else {
        servoBadgeEl.textContent = "STOPPED";
        servoBadgeEl.className = "badge stopped";
      }
    } catch (e) {
      console.error("JSON Parse Error:", e);
    }
  }
});

// Helper function to publish all settings + motor mode to ESP32
function sendControlCommand(modeOverride = null) {
  if (modeOverride) currentMotorMode = modeOverride;

  const maxTemp = parseFloat(document.getElementById("input-max-temp").value);
  const maxHum = parseFloat(document.getElementById("input-max-hum").value);
  const minDist = parseFloat(document.getElementById("input-min-dist").value);
  const maxDist = parseFloat(document.getElementById("input-max-dist").value);

  document.getElementById("active-range").textContent = `${minDist} - ${maxDist}`;

  const commandPayload = JSON.stringify({
    max_temp: maxTemp,
    max_hum: maxHum,
    min_dist: minDist,
    max_dist: maxDist,
    motor_mode: currentMotorMode
  });

  client.publish(controlTopic, commandPayload);
  console.log("Published Control Command:", commandPayload);
}

// Event Listeners for Buttons
document.getElementById("btn-apply").addEventListener("click", () => sendControlCommand());
document.getElementById("btn-auto").addEventListener("click", () => sendControlCommand("AUTO"));
document.getElementById("btn-run").addEventListener("click", () => sendControlCommand("RUN"));
document.getElementById("btn-stop").addEventListener("click", () => sendControlCommand("STOP"));