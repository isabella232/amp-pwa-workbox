let container = document.getElementById('container');
let offlineMessage = document.getElementById('offline');
let noDataMessage = document.getElementById('no-data');
let dataSavedMessage = document.getElementById('data-saved');
let saveErrorMessage = document.getElementById('save-error');

const dbPromise = createIndexedDB();

loadContentNetworkFirst();

function loadContentNetworkFirst() {
  getServerData() // then get updated server data
  .then(dataFromNetwork => {
    updateUI(dataFromNetwork); // display server data on page
    saveEventDataLocally(dataFromNetwork) // update local copy of data
    .then(() => {
      messageDataSaved();
    }).catch(err => {
      messageSaveError();
      console.warn(err);
    });
  }).catch(err => { // if we can't connect to the server...
    getLocalEventData() // attempt to get local data from IDB
    .then(offlineData => {
      if (!offlineData.length) { // alert user if there is no local data
        messageNoData();
      } else {
        messageOffline(); // alert user that we are using local data (possibly outdated)
        updateUI(offlineData); // display local data on page
      }
    });
  });
}

/* Network functions */

function getServerData() {
  return fetch('api/getAll').then(response => {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response.json();
  });
}

/* UI functions */

function updateUI(events) {
  events.forEach(event => {
    let eventItem = document.createElement('li');
    let table = document.createElement('table');
    let tableContent = [
      '<tr>',
        '<td>' + 'Title:' + '<td>',
        '<td>' + event.title + '<td>',
      '</tr>',
      '<tr>',
        '<td>' + 'Date:' + '<td>',
        '<td>' + event.date + '<td>',
      '</tr>',
      '<tr>',
        '<td>' + 'City:' + '<td>',
        '<td>' + event.city + '<td>',
      '</tr>',
      '<tr>',
        '<td>' + 'Note:' + '<td>',
        '<td>' + event.note + '<td>',
      '</tr>'
    ].join('\n');
    table.innerHTML = tableContent;
    eventItem.appendChild(table);
    container.appendChild(eventItem);
  });
}

function messageOffline() {
  // alert user that data may not be current
  offlineMessage.style.display = 'block';
}

function messageNoData() {
  // alert user that there is no data available
  noDataMessage.style.display = 'block';
}

function messageDataSaved() {
  // alert user that data has been saved for offline
  dataSavedMessage.style.display = 'block';
}

function messageSaveError() {
  // alert user that data couldn't be saved offline
  saveErrorMessage.style.display = 'block';
}

/* IndexedDB functions */

function createIndexedDB() {
  if (!('indexedDB' in window)) {return null;}
  return idb.open('dashboardr', 1, function(upgradeDb) {
    if (!upgradeDb.objectStoreNames.contains('events')) {
      let eventsOS = upgradeDb.createObjectStore('events', {keyPath: 'id'});
      eventsOS.createIndex('date', 'date');
      eventsOS.createIndex('city', 'city');
    }
  });
}

function getLocalEventData() {
  if (!('indexedDB' in window)) {return null;}
  return dbPromise.then(db => {
    let tx = db.transaction('events', 'readonly');
    let store = tx.objectStore('events');
    return store.getAll();
  });
}

function saveEventDataLocally(events) {
  if (!('indexedDB' in window)) {return null;}
  return dbPromise.then(db => {
    let tx = db.transaction('events', 'readwrite');
    let store = tx.objectStore('events');
    return Promise.all(events.map(event => {
      return store.put(event);
    }));
    // return tx.complete; // TODO investigate
  });
}