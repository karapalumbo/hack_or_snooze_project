$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedStories = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navLogOut = $("#nav-logout");
  const $navUserProfile = $("#nav-user-profile");
  const $navMainLinks = $(".main-nav-links");
  const $navSubmitStory = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $userProfile = $("#user-profile");
  const $profileName = $("#profile-name");
  const $profileUsername = $("#profile-username");
  const $profileDate = $("#profile-account-date");
  $userProfile.hide();

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  // shows stories submitted
  $navSubmitStory.on("click", function () {
    hideElements();
    $submitForm.show();
    $allStoriesList.show();
  });

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    const username = currentUser.username;
    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username,
    });

    // create new LI for new story
    const newStoryLI = $(`<li id=${storyObject.storyId}>
      <span class="star">
        <i class="far fa-star"></i>
      </span>
      <a class="article-link" href=${url} target="a_blank">
        <strong>${title}</strong>
      </a>
      <small class="article-author">by ${author}</small>
      <small class="article-hostname" ${getHostName(url)}>${getHostName(
      url
    )}</small>
      <small class="article-username">posted by ${username}</small>
    </li>   `);

    //adds new story to beginning of stories list
    $allStoriesList.prepend(newStoryLI);

    $($submitForm).slideToggle();
  });

  $(".articles-container").on("click", ".star", async function (evt) {
    const $target = $(evt.target); // star
    const $closestLi = $target.closest("li"); // closest LI to star
    const storyId = $closestLi.attr("id"); //  LI with attribute of ID

    if ($target.hasClass("fas")) {
      // if star has a class of 'fas' (highlighted)
      // calls API function to remove favorited story from list
      await currentUser.removeFavorite(storyId);
      // change class of the star with <i> tag to be 'far' (empty)
      $target.closest("i").toggleClass("fas far");
    } else {
      // the star is empty (story not favorited)
      await currentUser.addFavorite(storyId);
      $target.closest("i").toggleClass("fas far");
    }
  });

  // shows favorites
  $navFavorites.on("click", function () {
    hideElements();
    generateFavorites();
    $favoritedStories.show();
  });

  // shows user stories
  $navMyStories.on("click", function () {
    hideElements();
    generateOwnStories();
    $ownStories.show();
  });

  // shows name, username and date account created
  $navUserProfile.on("click", function () {
    hideElements();
    generateUserInfo();
    $userProfile.show();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $navWelcome.toggle();
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  function generateFavorites() {
    $favoritedStories.empty(); // empty out favorite's list

    if (currentUser.favorites.length === 0) {
      // if list has no storyes
      $favoritedStories.append("<h5>No favorites added!</h5>"); // add text
    } else {
      // loop over stories in favorites list
      for (let story of currentUser.favorites) {
        // add each story to favorites list depending on star
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
  }

  function generateOwnStories() {
    $ownStories.empty(); // empty list of stories
    if (currentUser.ownStories.length === 0) {
      // if the list is empty, add text
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // loop over each story in list
      for (let story of currentUser.ownStories) {
        // myStoryResult = user's story
        const myStoryResult = generateStoryHTML(story);
        const $trashIcon = $('<i class="fas fa-trash-alt"></i>');
        // add trash icon to beginning of each story
        myStoryResult.prepend($trashIcon);

        // add click event on trash icon
        $trashIcon.on("click", async function (e) {
          // if e.target is an <i> tag
          if (e.target.tagName === "I") {
            // remove the parent element, which is the story LI
            e.target.parentElement.remove();
          } // remove story from list
          await storyList.removeStory(currentUser, story.storyId);
          // calling function again to check if there are user stories
          await generateOwnStories();
        });
        // update/ add story to list of stories
        $ownStories.append(myStoryResult);
      }
    }
    // show list
    $ownStories.show();
  }

  function generateUserInfo() {
    const newDate = new Date(currentUser.createdAt);
    const day = newDate.getDate();
    const year = newDate.getFullYear();
    const month = newDate.getMonth();
    const formattedDate = `${year}-${month}-${day}`;

    $profileName.text(`Name: ${currentUser.name}`);
    $profileUsername.text(`Username: ${currentUser.username}`);
    $profileDate.text(`Acount Created: ${formattedDate}`);
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    generateUserInfo();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let classOfStar = isFavorite(story) ? "fas" : "far";
    // does star class = fas? if yes, class = fas. if no, class = far.
    // depending on which class, star will be highlighted or unhighlited
    const storyHTML = $(`
      <li id="${story.storyId}">
      <span class="star">
        <i class="${classOfStar} fa-star"></i>
      </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    return storyHTML;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoritedStories,
      $userProfile,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navWelcome.show();
    $navUserProfile.text(currentUser.username);
    $navMainLinks.show();
    $userProfile.hide();
  }

  function isFavorite(story) {
    let favStoryIds = new Set(); // create object
    if (currentUser) {
      // map over id's in each favorited story
      favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
    }
    return favStoryIds.has(story.storyId); // return object with id of each story
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
