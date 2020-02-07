let cityLat = 0;
let cityLon = 0;
let cityName = ''; // for getting the city name from the response, if needed
let countryCode = '';
let tempKelvin = 0;
let humidity = 0;
let windSpeed = 0;
let uvIndex = 0;
let iconName = '';
let iconURL= 'https://openweathermap.org/img/wn/';
let weatherIcon = '';
let wxRequestStub = 'https://api.openweathermap.org/data/2.5/';
let fiveDayRequestStub = 'https://api.openweathermap.org/data/2.5/forecast?q='; // + &mode=json
let uviQuery = 'uvi?'
// let apiKey = '&appid=d5063d29f50830106cfbe3f17f54053f'
let apiKey = "&appid=" + config.OW_API_KEY;
let searchHistory = {};
let d = new Date();
// let localTime = d.getHours() + ":" + d.getMinutes()
let localTime = d.toString();

$(document).ready(() => {
  localStorage.clear();
  renderSearchHistory();
})

// Create search history
let renderSearchHistory = () => {
  let searchHistory = JSON.parse(localStorage.getItem('searchHistory'));
  if(searchHistory) {
    arrayLength = searchHistory.length;
    for(let i = 0; i < arrayLength; ++i) {
      $(`#row${i}`).html(`<td><button class="recent btn btn-link p-0 text-muted">${searchHistory[i].searchString}</button></td>`);
    }
  }
}

/// Get the current weather
$( "table" ).on( "click", "button.recent", function() {
  event.preventDefault();
  getWxInfo($(this).text());
});

/// Make an empty array to store city history
let initLocalStorage = (() => {
  localStorage.setItem('searchHistory', '[]');
});

//Replace city-search element placeholder with real city
$('#city-search').click(() => {
  event.preventDefault();
  let citySearchString = validSearchString($('input').attr("placeholder", "City Name").val());
  getWxInfo(citySearchString);
})

// Do same on keypress event as with button
$('input').keypress(event => {
  if (event.which == 13) {
    event.preventDefault();
    let citySearchString = validSearchString($('input').attr("placeholder", "City Name").val());
    getWxInfo(citySearchString);
  }
})

// start weather query
let getWxInfo = (citySearchString => {
  let cityQuery = 'weather?q=' + citySearchString;
  // Get initial data from API
  $.ajax({
    url: wxRequestStub + cityQuery + apiKey,
    method: "GET",
    error: (err => {
      alert("Your city was not found. Enter a (city, 2-letter country code) pair.")
      return;
    })
  })
  // Save initial data request into variables
  .then((response) => {
    cityLat = response.coord.lat;
    cityLon = response.coord.lon;
    cityName = response.name;
    countryCode = response.sys.country;
    tempKelvin = response.main.temp;
    humidity = response.main.humidity;
    windSpeed = response.wind.speed;
    iconName = response.weather[0].icon;
    //Tried to get local sunrise and sunset times, but too hard w/ unix timestamps
    sunriseTime = response.sys.sunrise;
    sunsetTime = response.sys.sunset;
    tzOffset = response.timezone;
  })

  .then(() => {
    return $.ajax({
      url: wxRequestStub + uviQuery + apiKey + '&lat=' + cityLat + '&lon=' + cityLon,
      method: "GET"
    })
    .then(response => {
      uvIndex = response.value;
    })
    .then(() => {
      showValuesOnPage();
    })
  })

  $.ajax({
    url: fiveDayRequestStub + citySearchString + apiKey,
    method: "GET"
  })
  .then(response => {
    return set5DayData(response);
  })
})

let validSearchString = (city => {
  let search = city.split(',');
  if(search.length > 1){
    // make sure both strings aren't emtpy
    let first = search[0].length;
    let second = search[1].length;
    if(first === 0 || second === 0) {
      return first > second ? search[0] : search[1];
    }
    return search[0] + ',' + search[1];
  } else {
    return city;
  }
})

let dateString = (unixTime => {
  return moment(unixTime).format('ddd Do');
})

// Populate top card with city/country info
let showValuesOnPage = (() => {
  let searchString = cityName + ', ' + countryCode;
  $('#city-name').text(searchString);
  addToSearchHistory(searchString, Date.now());
  renderSearchHistory();

  //Assign values to all the variables in the top card
  $('#weather-icon').attr('src', iconURL + iconName + '.png')
  $('#temp-data').text('Temperature: ' +
    ((tempKelvin - 273.15) * 1.8 + 32).toFixed(0) + ' ' + String.fromCharCode(176) + 'F (' +
    (tempKelvin - 273.15).toFixed(1) + ' ' + String.fromCharCode(176) + 'C)');
  $('#hum-data').text('Humidity: ' + humidity + '%');
  $('#wind-data').text('Wind Speed: ' + windSpeed + ' MPH');
  $('#uvi-data').text('UV Index: ' + uvIndex);
  $('#time-data').text('Current Time: ' + localTime);
  // $('#sunrise-data').text('Sunrise: ' + sunriseTime);
  // $('#sunset-data').text('Sunset: ' + sunsetTime);
});

/// Set up the 5-day forecast cards with date, weather-icon, temp F, temp C and humidity
let set5DayData = (response => {
  let dataArray = response.list;
  let size = dataArray.length;
  let dayNumber = 1;
  for(let i = 0; i < size; i+=8) {
    $(`#five-day-${dayNumber}`).find('h6').text(dateString(dataArray[i].dt * 1000));
    $(`#five-day-${dayNumber}`).find('.weather-icon').attr('src', iconURL + dataArray[i].weather[0].icon + '.png');
    $(`#five-day-${dayNumber}`).find('.temp-5').text('Temperature: ' +
      ((dataArray[i].main.temp - 273.15) * 1.8 + 32).toFixed(0) + ' ' + String.fromCharCode(176) + 'F / ' +
      (dataArray[i].main.temp - 273.15).toFixed(1) + ' ' + String.fromCharCode(176) + 'C');
    $(`#five-day-${dayNumber}`).find('.hum-5').text('Humidity: ' + dataArray[i].main.humidity + '%');
    ++ dayNumber;
  }
})

// Save history to local storage
let saveToLocalStorage = (searchHistory => {
  return localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
});

// Incremenent search history
let addToSearchHistory = (searchString, timeStamp) => {
  let obj = {
    "searchString": searchString,
    "timeStamp": timeStamp
  }
  // Get search list from local storage
  let searchHistory = JSON.parse(localStorage.getItem('searchHistory'));
  if(!searchHistory) {
    searchHistory = [];
  }

  //
  let len = searchHistory.length;
  let inArray = false;
  for(let i = 0; i < len; ++i) {
    if(searchHistory[i].searchString === obj.searchString) {
      searchHistory[i].timeStamp = obj.timeStamp;
      inArray = true;
    }
  }

  if(inArray === false) {
    searchHistory.push(obj);
  }

  searchHistory.sort((b, a) => {
    return a.timeStamp - b.timeStamp;
  });

  // Nuke results after 10 cities
  while(searchHistory.length > 10) {
    let popResult = searchHistory.pop();
  }

  saveToLocalStorage(searchHistory);
}
