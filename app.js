{
  "name": "JAY-JAY_MD",
  "description": "Javascript WhatsApp bot made by Jay Jay",
  "logo": "https://i.ibb.co/NgqMGZcG/104b15826bbe.jpg",
  "keywords": ["bot"],
  "success_url": "/",

  "env": {
    "SESSION_ID": {
      "description": "Put the session-id here.",
      "required": true
    }
},

     "buildpacks": [
        {
            "url": "https://github.com/heroku/heroku-buildpack-nodejs.git"
        }
     ],
  "stack": "heroku-24"
