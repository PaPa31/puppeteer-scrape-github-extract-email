const puppeteer = require("puppeteer");
const CREDS = require("./creds");

async function run() {
  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();

  await page.goto("https://github.com/login");
  //  await page.screenshot({ path: "screenshots/github.png" });

  const USERNAME_SELECTOR = "#login_field";
  const PASSWORD_SELECTOR = "#password";
  const BUTTON_SELECTOR =
    "#login > div.auth-form-body.mt-3 > form > div > input.btn.btn-primary.btn-block.js-sign-in-button";

  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(CREDS.username);

  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(CREDS.password);

  await Promise.all([page.click(BUTTON_SELECTOR), page.waitForNavigation()]);

  const userToSearch = "john";

  const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users&utf8=%E2%9C%93`;

  await page.goto(searchUrl);
  await page.waitForTimeout(2 * 1000);

  const LIST_USERNAME_SELECTOR =
    "#user_search_results > div > div:nth-child(INDEX) > div > div:nth-child(1) > div > a";

  const LIST_EMAIL_SELECTOR =
    "#user_search_results > div > div:nth-child(INDEX) > div + div > div ~ div > div + div > a";

  const LENGTH_SELECTOR_CLASS = "hx_hit-user";

  let listLength = await page.evaluate((sel) => {
    return document.getElementsByClassName(sel).length;
  }, LENGTH_SELECTOR_CLASS);

  console.log("listLength = " + listLength);

  for (let i = 1; i <= listLength; i++) {
    // change the index to the next child
    let usernameSelector = LIST_USERNAME_SELECTOR.replace("INDEX", i);
    let emailSelector = LIST_EMAIL_SELECTOR.replace("INDEX", i);

    let username = await page.evaluate((sel) => {
      console.log("document.querySelector(sel)" + document.querySelector(sel));
      return document.querySelector(sel).getAttribute("href").replace("/", "");
    }, usernameSelector);

    let email = await page.evaluate((sel) => {
      let element = document.querySelector(sel);
      return element ? element.innerHTML : null;
    }, emailSelector);

    // not all users have emails visible
    if (!email) continue;

    console.log(username, " -> ", email);

    // TODO save this user
  }

  browser.close();
}

run();
