const puppeteer = require('puppeteer');
const fs = require('fs');

function timeout(miliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => {resolve()}, miliseconds)
  })
}

async function setupBrowser() {
  const viewportHeight = 800;
  const viewportWidth = 1080;
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); 
  await page.setViewport({width: viewportWidth, height: viewportHeight});
  
  page.on('console', async (msg) => {
	const msgArgs = msg.args();
  	for (let i = 0; i < msgArgs.length; ++i) {
  	  try {
  		console.log(await msgArgs[i].jsonValue());
  	  } catch(e) {
  	  	console.log(e);
  	  }
    }
  });

  return [browser, page]
}

async function linkedInLogin(page, config) {
  await page.goto("https://www.linkedin.com/")

  if (fs.existsSync('./cookies.json')) {
    return await loadCookies(page);
  } 

  await page.waitForSelector("input[autocomplete=\"username\"]");
  await page.focus("input[autocomplete=\"username\"]")

  await timeout(1000)
  await page.keyboard.type(config.username)

  await page.waitForSelector("[autocomplete=\"current-password\"]");
  await page.focus("[autocomplete=\"current-password\"]")
  await page.keyboard.type(config.password)
  await page.keyboard.press('Enter');
  await timeout(5000)

  // go back to the domain you'll be scraping
  await page.goto('https://linkedin.com')

  const cookies = await page.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
  console.log("Logged in and saved cookies");
}

async function loadCookies(page) {
  const cookiesString = fs.readFileSync('./cookies.json');
  const cookies = JSON.parse(cookiesString);
  await page.setCookie(...cookies);
}

module.exports = {
  setupBrowser,
  linkedInLogin,
  timeout,
  loadCookies
}