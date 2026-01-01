const OS_VERSIONS = [
  "Windows 10",
  "Windows 11",
  "macOS Big Sur",
  "macOS Monterey",
  "macOS Ventura",
  "Ubuntu 20.04",
  "Ubuntu 22.04",
  "Fedora 35",
  "Fedora 36",
  "Debian 11"
];

const DEVICE_NAMES = [
  "Chrome",
  "Firefox",
  "Edge",
  "Safari",
  "Opera",
  "Vivaldi",
  "Brave",
  "Chromium",
  "Windows 10",
  "Windows 11",
  "macOS Big Sur",
  "macOS Monterey",
  "macOS Ventura",
  "Ubuntu 20.04",
  "Ubuntu 22.04",
  "Fedora 35",
  "Fedora 36",
  "Debian 11"
];

const SCREEN_SIZES = [
  "1920x1080 1.0x",
  "1366x768 1.0x",
  "1440x900 1.0x",
  "1536x864 1.0x",
  "1280x720 1.0x",
  "1600x900 1.0x",
  "1680x1050 1.0x",
  "2560x1440 1.0x",
  "3840x2160 1.0x"
];

const TIMEZONES = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Kamchatka"
];

function checkPhone(phone) {
  return !!phone.match(/^\+?\d{10,15}$/);
}

function choice(arr) {
  return arr[Math.floor(Math.random() *arr.length)];
}

module.exports = { OS_VERSIONS, DEVICE_NAMES, SCREEN_SIZES, TIMEZONES, checkPhone, choice };