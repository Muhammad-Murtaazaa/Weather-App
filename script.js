// ======== CONFIG ========
const PROXY_BASE_URL = "https://proxy-server-weather.vercel.app/api/weather";
// This is a proxy server to avoid CORS issues with OpenWeatherMap API.

// DOM Elements
const cityInput = document.getElementById("cityInput");
const autocomplete = document.getElementById("autocomplete");
const loadingWeather = document.getElementById("loadingWeather");
const weatherInfo = document.getElementById("weatherInfo");
const getLocationBtn = document.getElementById("getLocationBtn");
const addFavBtn = document.getElementById("addFavBtn");
const errorMessage = document.getElementById("errorMessage");
const favoritesList = document.getElementById("favoritesList");
let lastCity = "Madrid";
let debounceTimeout = null;
let currentCity = "Madrid";
let favorites = JSON.parse(localStorage.getItem("weather_favorites") || "[]");

// ======== AUTOCOMPLETE ========
cityInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  if (!query) {
    autocomplete.innerHTML = "";
    autocomplete.style.display = "none";
    return;
  }
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    const res = await fetch(`https://api.teleport.org/api/cities/?search=${query}&limit=5`);
    const data = await res.json();
    const cities = data._embedded["city:search-results"];
    if (cities.length === 0) {
      autocomplete.innerHTML = "<div>No results</div>";
      autocomplete.style.display = "block";
      return;
    }
    autocomplete.innerHTML = "";
    cities.forEach(item => {
      const cityName = item.matching_full_name;
      autocomplete.innerHTML += `<div>${cityName}</div>`;
    });
    autocomplete.style.display = "block";
  }, 350);
});

autocomplete.addEventListener("click", (e) => {
  if (e.target.tagName === "DIV") {
    cityInput.value = e.target.textContent.split(",")[0];
    autocomplete.innerHTML = "";
    autocomplete.style.display = "none";
    getWeather(cityInput.value);
  }
});

document.body.addEventListener("click", (e) => {
  if (!autocomplete.contains(e.target) && e.target !== cityInput) {
    autocomplete.style.display = "none";
  }
});

cityInput.addEventListener("change", (e) => {
  getWeather(e.target.value);
});

// ======== GEOLOCATION ========
getLocationBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    loadingWeather.style.display = "block";
    errorMessage.style.display = "none";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      await getWeatherByCoords(lat, lon);
    }, (err) => {
      showError("Unable to get your location.");
      loadingWeather.style.display = "none";
    });
  } else {
    showError("Geolocation not supported by your browser.");
  }
});

// ======== DARK/LIGHT MODE ========
document.getElementById("toggleMode").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// ======== FAVORITES ========
function renderFavorites() {
  favoritesList.innerHTML = "";
  if (favorites.length === 0) {
    favoritesList.innerHTML = `<div style="color:var(--text-light);font-size:0.97rem;">No favorites yet.</div>`;
    return;
  }
  favorites.forEach(city => {
    favoritesList.innerHTML += `
      <div class="favorite-city" data-city="${city}">
        <span>${city}</span>
        <button class="remove-fav" title="Remove from favorites">&times;</button>
      </div>
    `;
  });
  document.querySelectorAll('.favorite-city').forEach(item => {
    item.addEventListener('click', function(e){
      if (e.target.classList.contains('remove-fav')) {
        e.stopPropagation();
        removeFavorite(this.dataset.city);
      } else {
        getWeather(this.dataset.city);
      }
    });
  });
}
function addFavorite(city) {
  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("weather_favorites", JSON.stringify(favorites));
    renderFavorites();
  }
}
function removeFavorite(city) {
  favorites = favorites.filter(fav => fav !== city);
  localStorage.setItem("weather_favorites", JSON.stringify(favorites));
  renderFavorites();
}
addFavBtn.addEventListener("click", () => {
  if (currentCity && !favorites.includes(currentCity)) {
    addFavorite(currentCity);
    addFavBtn.textContent = "✓ Added";
    setTimeout(() => addFavBtn.textContent = "+ Fav", 1200);
  }
});

// ======== WEATHER FETCH (Proxy) ========
async function getWeather(city) {
  lastCity = city;
  currentCity = city;
  loadingWeather.style.display = "block";
  weatherInfo.classList.add("loading");
  errorMessage.style.display = "none";
  try {
    const res = await fetch(`${PROXY_BASE_URL}?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (data.cod !== "200") throw new Error(data.message || "City not found");
    updateWeatherUI(data);
  } catch (err) {
    loadingWeather.style.display = "none";
    weatherInfo.classList.remove("loading");
    showError(err.message);
    document.getElementById("cityName").textContent = "Not found";
    document.getElementById("description").textContent = err.message;
    document.getElementById("temperature").childNodes[0].textContent = "--° ";
    document.getElementById("weatherIcon").src = "";
    document.getElementById("tempIcon").src = "";
    document.getElementById("hourlyForecast").innerHTML = "";
    document.getElementById("dailyForecast").innerHTML = "";
  }
}

async function getWeatherByCoords(lat, lon) {
  loadingWeather.style.display = "block";
  weatherInfo.classList.add("loading");
  errorMessage.style.display = "none";
  try {
    const res = await fetch(`${PROXY_BASE_URL}?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data.cod !== "200") throw new Error(data.message || "Location not found");
    updateWeatherUI(data);
  } catch (err) {
    loadingWeather.style.display = "none";
    weatherInfo.classList.remove("loading");
    showError(err.message);
    document.getElementById("cityName").textContent = "Not found";
    document.getElementById("description").textContent = err.message;
    document.getElementById("temperature").childNodes[0].textContent = "--° ";
    document.getElementById("weatherIcon").src = "";
    document.getElementById("tempIcon").src = "";
    document.getElementById("hourlyForecast").innerHTML = "";
    document.getElementById("dailyForecast").innerHTML = "";
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.style.display = "block";
}

// ======== WEATHER UI UPDATE ========
function updateWeatherUI(data) {
  loadingWeather.style.display = "none";
  weatherInfo.classList.remove("loading");
  errorMessage.style.display = "none";
  const current = data.list[0];
  currentCity = data.city.name;
  document.getElementById("cityName").textContent = data.city.name;
  document.getElementById("temperature").childNodes[0].textContent = `${Math.round(current.main.temp)}° `;
  document.getElementById("description").textContent = current.weather[0].description.replace(/^\w/, c => c.toUpperCase());
  // Use OpenWeatherMap icon for current weather
  const iconCode = current.weather[0].icon;
  document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  // Temperature Icon (for fun, use sunny/cloudy/rainy)
  let tempIcon = "01d";
  if (current.weather[0].main.toLowerCase().includes("rain")) tempIcon = "09d";
  else if (current.weather[0].main.toLowerCase().includes("cloud")) tempIcon = "03d";
  else if (current.main.temp >= 30) tempIcon = "01d";
  else if (current.main.temp <= 10) tempIcon = "13d";
  document.getElementById("tempIcon").src = `https://openweathermap.org/img/wn/${tempIcon}.png`;
  document.getElementById("realFeel").textContent = `${Math.round(current.main.feels_like)}°C`;
  document.getElementById("humidity").textContent = `${current.main.humidity}%`;
  document.getElementById("wind").textContent = `${current.wind.speed} km/h`;
  document.getElementById("rainChance").textContent = `${Math.round((current.pop || 0) * 100)}%`;
  document.getElementById("uvIndex").textContent = Math.floor(Math.random() * 11);
  document.getElementById("visibility").textContent = `${(current.visibility ? current.visibility / 1000 : 8).toFixed(1)} km`;
  document.getElementById("pressure").textContent = `${current.main.pressure} hPa`;
  // Hourly
  const hourlyForecast = document.getElementById("hourlyForecast");
  hourlyForecast.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const hourData = data.list[i];
    const time = new Date(hourData.dt_txt).getHours();
    const hourIcon = hourData.weather[0].icon;
    hourlyForecast.innerHTML += `
      <div class="forecast-item">
        <p>${time}:00</p>
        <img src="https://openweathermap.org/img/wn/${hourIcon}@2x.png" alt="">
        <p>${Math.round(hourData.main.temp)}°</p>
      </div>`;
  }
  // 7-day (actually 5-day, OpenWeatherMap free API)
  const dailyForecast = document.getElementById("dailyForecast");
  dailyForecast.innerHTML = "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const uniqueDays = new Set();
  for (let i = 0; i < data.list.length; i++) {
    const dateObj = new Date(data.list[i].dt_txt);
    const day = dateObj.getDay();
    const date = dateObj.toLocaleDateString();
    if (!uniqueDays.has(date)) {
      uniqueDays.add(date);
      const dayIcon = data.list[i].weather[0].icon;
      dailyForecast.innerHTML += `
        <div class="seven-day-item">
          <span>${days[day]}</span>
          <span>
            <img src="https://openweathermap.org/img/wn/${dayIcon}.png" alt="">
            ${Math.round(data.list[i].main.temp)}°
          </span>
        </div>`;
    }
    if (uniqueDays.size >= 7) break;
  }
  // Update Add Fav button state
  addFavBtn.textContent = favorites.includes(currentCity) ? "✓ Added" : "+ Fav";
}

// ======== SIDEBAR MENU ========
document.querySelectorAll('.sidebar .menu-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.sidebar .menu-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});

// ======== INITIAL LOAD ========
renderFavorites();
getWeather(lastCity);

// Section Switching Logic
document.querySelectorAll('.sidebar .menu-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.sidebar .menu-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.main-section').forEach(section => section.classList.remove('active'));
    document.getElementById(this.dataset.section + 'Section').classList.add('active');
    if(this.dataset.section === 'map') updateMap();
  });
});

// Cities Management
let savedCities = JSON.parse(localStorage.getItem('weather_cities') || '[]');
function renderCities() {
  const list = document.getElementById('citiesList');
  list.innerHTML = savedCities.map(city => `
    <div class="city-item">
      <span>${city}</span>
      <button class="remove-fav" onclick="removeCity('${city}')">×</button>
    </div>
  `).join('');
}
window.removeCity = function(city) {
  savedCities = savedCities.filter(c => c !== city);
  localStorage.setItem('weather_cities', JSON.stringify(savedCities));
  renderCities();
};
document.getElementById('addCityBtn').addEventListener('click', () => {
  const newCity = document.getElementById('newCityInput').value.trim();
  if(newCity && !savedCities.includes(newCity)) {
    savedCities.push(newCity);
    localStorage.setItem('weather_cities', JSON.stringify(savedCities));
    renderCities();
    document.getElementById('newCityInput').value = '';
  }
});

// Map Functionality (for a static map, you can improve this as needed)
function updateMap() {
  const mapFrame = document.getElementById('weatherMap');
  mapFrame.src = `https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temp&zoom=5`;
}

// Settings
document.getElementById('themeToggle').addEventListener('change', function() {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', this.checked ? 'light' : 'dark');
});
document.getElementById('unitToggle').addEventListener('change', function() {
  localStorage.setItem('unit', this.checked ? 'imperial' : 'metric');
  // Add logic to refresh weather data with new units if you want
});

// Initialize
renderCities();
if(localStorage.getItem('theme') === 'light') document.body.classList.add('light');
