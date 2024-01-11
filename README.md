# linkedin-cupid
A script that uses an LLM (Llama2) and Browser Automation to match LinkedIn profiles together for dating compatibility.

This was built during this [livestream](https://youtube.com/live/_xt2F8rR8CA)

# Setup (required)
Get all the packages
```
$ npm install
```

add a `config.json`. You need a linkedin account and a runpod API KEY
```
{
	"username": "linkedin username/email",
	"password": "linkedin password",
	"API_KEY": "runpod.io API KEy"
}
```

# How to run
```
$ node main.js
```
