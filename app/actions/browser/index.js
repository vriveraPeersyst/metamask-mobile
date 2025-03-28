/**
 * Browser actions for Redux
 */
export const BrowserActionTypes = {
  ADD_TO_VIEWED_DAPP: 'ADD_TO_VIEWED_DAPP',
};

/**
 * Adds a new entry to viewed dapps
 *
 * @param {string} hostname - Dapp hostname
 * @returns
 */
export function addToViewedDapp(hostname) {
  return {
    type: BrowserActionTypes.ADD_TO_VIEWED_DAPP,
    hostname,
  };
}

/**
 * Adds a new entry to the browser history
 *
 * @param {Object} website - The website that has been visited
 * @param {string} website.url - The website's url
 * @param {string} website.name - The website name
 */
export function addToHistory({ url, name }) {
  return {
    type: 'ADD_TO_BROWSER_HISTORY',
    url,
    name,
  };
}

/**
 * Clears the entire browser history
 */
export function clearHistory(metricsEnabled, marketingEnabled) {
  return {
    type: 'CLEAR_BROWSER_HISTORY',
    id: Date.now(),
    metricsEnabled,
    marketingEnabled,
  };
}

/**
 * Adds a new entry to the whitelist
 *
 * @param {string} url - The website's url
 */
export function addToWhitelist(url) {
  return {
    type: 'ADD_TO_BROWSER_WHITELIST',
    url,
  };
}

/**
 * Closes all the opened tabs
 */
export function closeAllTabs() {
  return {
    type: 'CLOSE_ALL_TABS',
  };
}

/**
 * Creates a new tab
 *
 * @param {string} url - The website's url
 * @param {string} linkType - optional link type
 */
export function createNewTab(url, linkType) {
  return {
    type: 'CREATE_NEW_TAB',
    url,
    linkType,
    id: Date.now(),
  };
}

/**
 * Closes an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function closeTab(id) {
  return {
    type: 'CLOSE_TAB',
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function setActiveTab(id) {
  return {
    type: 'SET_ACTIVE_TAB',
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 * @param {Object} data - { isArchived: boolean, url: string, image: string }
 */
export function updateTab(id, data) {
  return {
    type: 'UPDATE_TAB',
    id,
    data,
  };
}

/**
 * Stores the favicon url using the origin as key
 * @param {Object} favicon - favicon to store
 * @param {string} favicon.origin - the origin of the favicon as key
 * @param {string} favicon.url - the favicon image url
 * @returns {{favicon, type: string}}
 */
export function storeFavicon({ origin, url }) {
  return {
    type: 'STORE_FAVICON_URL',
    origin,
    url,
  };
}
