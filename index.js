const puppeteer = require("puppeteer");
const CREDS = require("./creds");
const mongoose = require("mongoose");
const User = require("./models/user");

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

  const userToSearch = "papa33";

  const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users&utf8=%E2%9C%93`;

  await page.goto(searchUrl);
  await page.waitForTimeout(2 * 1000);

  const LIST_USERNAME_SELECTOR =
    "#user_search_results > div > div:nth-child(INDEX) > div > div:nth-child(1) > div > a";

  const LIST_EMAIL_SELECTOR =
    "#user_search_results > div > div:nth-child(INDEX) > div + div > div ~ div > div > a";

  //"#user_search_results > div.Box.border-0 > div:nth-child(INDEX) > div.flex-auto > div.d-flex.flex-wrap.text-small.color-fg-muted > div > a";

  const LENGTH_SELECTOR_CLASS = "hx_hit-user";

  let numPages = await getNumPages(page);

  console.log("numPages = " + numPages);

  for (let h = 1; h <= numPages; h++) {
    let pageUrl = searchUrl + "&p=" + h;

    await page.goto(pageUrl);

    let listLength = await page.evaluate((sel) => {
      return document.getElementsByClassName(sel).length;
    }, LENGTH_SELECTOR_CLASS);

    for (let i = 1; i <= listLength; i++) {
      // change the index to the next child
      let usernameSelector = LIST_USERNAME_SELECTOR.replace("INDEX", i);
      let emailSelector = LIST_EMAIL_SELECTOR.replace("INDEX", i);

      let username = await page.evaluate((sel) => {
        return document
          .querySelector(sel)
          .getAttribute("href")
          .replace("/", "");
      }, usernameSelector);

      let email = await page.evaluate((sel) => {
        let element = document.querySelector(sel);
        return element ? element.innerHTML : null;
      }, emailSelector);

      // not all users have emails visible
      if (!email) continue;

      console.log(username, " -> ", email);

      // TODO save this user
      upsertUser({
        username: username,
        email: email,
        dateCrawled: new Date(),
      });
    }
  }

  if (mongoose.connection.readyState == 1) {
    mongoose.disconnect().then(() => {
      console.log("Mongo disconnected");
      console.log(
        "\nRun mongo shell in your terminal: `mongo` or `mongosh` \n(depend on your MongoDB version)"
      );
      console.log("Run `use ghe` (open our db)");
      console.log("Run `db.users.find()`");
    });
  }

  browser.close();
}

run();

async function getNumPages(page) {
  const NUM_USER_SELECTOR =
    "body > div.logged-in > div.application-main > main > div > div.codesearch-results > div > div > h3";

  let inner = await page.evaluate((sel) => {
    let html = document.querySelector(sel).innerHTML;

    // format is: "13 users"
    return html.replace(",", "").replace("users", "").trim();
  }, NUM_USER_SELECTOR);

  let numUsers = parseInt(inner);

  console.log("numUsers: ", numUsers);

  //GitHub shows 10 results per page, so

  let numPages = Math.ceil(numUsers / 10);
  return numPages;
}

function upsertUser(userObj) {
  // ghe=github-users-with-email
  const DB_URL = "mongodb://127.0.0.1/ghe";

  if (mongoose.connection.readyState == 0) {
    mongoose
      .connect(DB_URL)
      .then(() => {
        console.log("Mongo connected");
      })
      .catch((e) => console.log("ERrROR: " + e));
  }

  // if this email exists, update the entry, don't insert
  let conditions = { email: userObj.email };
  let options = { upsert: true, new: true, setDefaultsOnInsert: true };

  User.findOneAndUpdate(conditions, userObj, options, (err, addedUser) => {
    if (err) return console.log(err);

    console.log("User added/updated: \n", addedUser);
  });
}
