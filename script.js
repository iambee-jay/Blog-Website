// Client

// get Stored Data

let storedToken = localStorage.getItem("jwtToken");
let storedUsername = localStorage.getItem("username");

// set the username in the HTML
const usernameElement = document.getElementById("username");
usernameElement.innerHTML = storedUsername;

// load page and event listeners

document.addEventListener("DOMContentLoaded", () => {
  const baseUrl = window.location.origin;
  fetchPosts(baseUrl);

  if (storedToken) {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole == "admin") {
      showAdminFeatures();
    }
  }

  const form = document.getElementById("new_post_form");
  if (form) {
    form.addEventListener("submit", (event) => createPost(event, baseUrl));
  }

  const loginForm = document.getElementById("login_form");
  loginForm.addEventListener("submit", (event) => loginUser(event, baseUrl));

  const registerForm = document.getElementById("register_form");
  registerForm.addEventListener("submit", (event) =>
    registerUser(event, baseUrl)
  );
});

// post details

const postDetailContainer = document.getElementById("post_detail_container");

// addlistener to the post detail container

window.addEventListener("load", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("post");

  if (postId) {
    showPostDetail(postId);
  }
});

//fetch posts

async function fetchPosts(baseUrl) {
  const res = await fetch(`${baseUrl}/posts`);
  const data = await res.json();
  const postList = document.getElementById("post_list");
  const isAdmin = localStorage.getItem("userRole") === "admin";

  if (postList) {
    postList.innerHTML = data
      .map((post, index) => {
        const deleteButtonStyle = isAdmin ? "" : "display: none";
        const updateButtonStyle = isAdmin ? "" : "display: none";

        return `
        <div id="${post._id}" class="post">
          <img
            src="${post.imageUrl}"
            alt="Image"
          />
          <div class="post_title">
            ${
              index === 0
                ? `<h1><a href="/posts/${post._id}"> ${post.title}</a></h1>`
                : `<h3><a href="/posts/${post._id}"> ${post.title}</a></h3>`
            }
          </div>
          ${
            index === 0
              ? `<span><p>${post.author}</p><p>${post.timestamp}</p></span>`
              : ""
          }
          <div id="admin_buttons">
            <button class="btn" style = "${deleteButtonStyle}"onclick = "deletePost('${
          post._id
        }', '${baseUrl}')">Delete</button>
            <button class="btn" style = "${deleteButtonStyle}"onclick = "showUpdateForm('${
          post._id
        }', '${post.title}', '${post.content}')">Update</button>
          </div>
          ${index === 0 ? "<hr>" : ""}
          ${index === 0 ? "<h2> All Articles </h2>" : ""}
        </div>
      `;
      })
      .join("");
  }
}

async function createPost(event, baseUrl) {
  event.preventDefault();

  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const imageUrlInput = document.getElementById("image_url");

  //get the values from the inputs feilds

  const title = titleInput.value;
  const content = contentInput.value;
  const imageUrl = imageUrlInput.value;

  //ensure input are not empty
  if (!title || !content || !imageUrl) {
    alert("Please enter all fields");
    return;
  }

  const newPost = {
    title,
    content,
    imageUrl,
    author: storedUsername,
    timestamp: new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${storedToken}`,
  });

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(newPost),
  };

  try {
    const response = await fetch(`${baseUrl}/posts`, requestOptions);
    if (!response.ok) {
      const storedRole = localStorage.getItem("userRole");
      console.log(`Error craeating the post: http status ${response.status}`);
    } else {
      // clear the input data
      titleInput.value = "";
      contentInput.value = "";
      imageUrlInput.value = "";
      alert("Post created successfully");
    }
  } catch (err) {
    console.log("Error creating post: ", err);
    alert("craete post failed.");
  }
  fetchPosts(baseUrl);
}

// delete post route

async function deletePost(postId, baseUrl) {
  const deleteUrl = `${baseUrl}/posts/${postId}`;

  try {
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });
    if (response.ok) {
      alert("Post deleted successfully");
      fetchPosts(baseUrl);
    } else {
      alert("Delete post failed");
    }
  } catch (error) {
    console.log(`Error deleting post: ${error}`);
    alert("Delete post failed");
  }
}

// show update form

function showUpdateForm(postId, title, content) {
  const updateForm = `
  <form id="update_form">
  <input type="text" id="update_title" value="${title}" />
  <textarea id="update_content">${content}</textarea>
  <button type="submit">Update Post</button>
  </form>
  `;

  const postElement = document.getElementById(postId);
  postElement.innerHTML += updateForm;

  const form = document.getElementById("update_form");
  form.addEventListener("submit", (event) => updateForm(event, postId));
}

// update post
async function updateForm(event, postId) {
  event.preventDefault();

  const title = document.getElementById("update_title").value;
  const tcontentitle = document.getElementById("update_content").value;
  const baseUrl = window.location.origin;

  // ensure input are not empty
  if (!title || !content) {
    alert("Please enter all fields");
    return;
  }

  const updatedPost = {
    title,
    content,
  };
  try {
    const response = await fetch(`${baseUrl}/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storedToken}`,
      },
      body: JSON.stringify(updatedPost),
    });
    if (response.ok) {
      alert("Post Updated successfully");
      fetchPosts(baseUrl);
    } else {
      alert("Update post failed");
    }
  } catch (error) {
    console.log(`An error occured during the fetch: ${error}`);
    alert("Update post failed");
  }
}

// Register user

async function registerUser(event, baseUrl) {
  event.preventDefault();

  const usernameInput = document.getElementById("register_username");
  const passwordInput = document.getElementById("register_password");
  const roleInput = document.getElementById("register_role");
  const username = usernameInput.value;
  const password = passwordInput.value;
  const role = roleInput.value;

  // ensure input are not empty
  if (!username || !password || !role) {
    alert("Please enter all fields");
    return;
  }

  const newUser = {
    username,
    password,
    role,
  };

  const response = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newUser),
  });

  const data = await response.json();

  if (data.success) {
    alert("Regsitered successfully");
    // clear the input data
    usernameInput.value = "";
    passwordInput.value = "";
    roleInput.value = "";
  } else {
    alert("Registration  failed");
  }
}

// login user

async function loginUser(event, baseUrl) {
  event.preventDefault();

  const usernameInput = document.getElementById("login_username");
  const passwordInput = document.getElementById("login_password");

  const username = usernameInput.value;
  const password = passwordInput.value;

  if (!username || !password) {
    alert("Please enter all fields");
    return;
  }

  const user = {
    username,
    password,
  };

  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem("jwtToken", data.token);
    localStorage.setItem("userRole", data.role);
    localStorage.setItem("username", username);

    // close the hamburger menu
    linksContainer.classList.toggle("active");
    hamburger.classList.toggle("active");

    // clear the input data
    usernameInput.value = "";
    passwordInput.value = "";

    location.reload();

    if (data.role === "admin") {
      showAdminFeatures();
    }
  } else {
    alert("Login  failed");
  }
}

//Admin features

function showAdminFeatures() {
  const newPostDiv = document.getElementById("new_post_div");

  if (newPostDiv) {
    newPostDiv.style.display = "flex";
  }

  const allBtns = document.querySelectorAll(".btn");
  allBtns.forEach((btn) => {
    if (btn) {
      btn.style.display = "block";
    }
  });
}

//Logout user

document.addEventListener("DOMContentLoaded", () => {
  const baseUrl = window.location.origin;
  const registerDiv = document.getElementById("register_div");
  const loginDiv = document.getElementById("login_div");
  const logoutDiv = document.getElementById("logout_div");
  const logoutButton = document.getElementById("logout_button");

  if (storedToken) {
    registerDiv.style.display = "none";
    loginDiv.style.display = "none";
    logoutDiv.style.display = "flex";
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      location.reload();
    });
  } else {
    registerDiv.style.display = "flex";
    loginDiv.style.display = "flex";
    logoutDiv.style.display = "none";
  }
});
