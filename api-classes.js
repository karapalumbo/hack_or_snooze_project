const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map((story) => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);

    return storyList;
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  async addStory(user, newStory) {
    // TODO - Implement this functions!
    // this function should return the newly created story so it can be used in
    // the script.js file where it will be appended to the DOM
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        token: user.loginToken,
        story: newStory,
      },
    });
    //create new story instance
    const newUserStory = new Story(response.data.story);
    //prepends story to this.stories array (list of stories)
    this.stories.unshift(newUserStory); // array of all stories
    user.ownStories.unshift(newUserStory); // array of user's stories
    //returns new story
    return newUserStory;
  }

  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
        token: user.loginToken,
      },
    });
    /** 
     filter over array of stories and return new array. New array 
     will not include the storyId that was deleted 
     */
    this.stories = this.stories.filter(function (story) {
      return story.storyId !== storyId;
    });
    user.ownStories = user.ownStories.filter(function (story) {
      return story.storyId !== storyId;
    });
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      },
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password,
      },
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(
      (singleStory) => new Story(singleStory)
    );
    existingUser.ownStories = response.data.user.stories.map(
      (singleStory) => new Story(singleStory)
    );

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token,
      },
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(
      (singleStory) => new Story(singleStory)
    );
    existingUser.ownStories = response.data.user.stories.map(
      (singleStory) => new Story(singleStory)
    );
    return existingUser;
  }

  // Makes an API request to get information about the logged-in user
  async getUserDetails() {
    // response shows object about the logged-in user
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken,
      },
    });

    // based on the response, set properties to update user's info
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;

    /** maps over favorites array, creates a new Story instance
     * for each favorited story in the new array
     */
    this.favorites = response.data.user.favorites.map(function (singleStory) {
      return new Story(singleStory);
    });

    // does same as above but for user's own stories
    this.ownStories = response.data.user.stories.map(function (singleStory) {
      return new Story(singleStory);
    });

    return this;
  }

  // Adds story to favorites list based on POST request
  addFavorite(storyId) {
    return this.toggleFavorite(storyId, "POST");
  }

  // removes story from favorites list based on DELETE request
  removeFavorite(storyId) {
    return this.toggleFavorite(storyId, "DELETE");
  }

  /**
   * A method to POST or DELETE favorited stories
   * - storyId: an ID of a story to add/ remove from favorites
   * - apiMethod: POST (add) or DELETE (remove) favorited story
   */
  async toggleFavorite(storyId, apiMethod) {
    const favoriteResponse = await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: apiMethod,
      data: {
        token: this.loginToken,
      },
    });

    await this.getUserDetails();
    return favoriteResponse;
  }
}

/**
 * Class to represent a single story.
 */

class Story {
  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}
