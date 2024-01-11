const fs = require("fs");
const config = JSON.parse(fs.readFileSync("../config.json"))
class LLM {
	constructor() {
		this.API_KEY = config.API_KEY;
	}

	async llama2Request(prompt, json) {
		const response = await fetch('https://api.runpod.ai/v2/llama2-13b-chat/runsync', {
			method: "POST",
			headers: {
				'accept': 'application/json',
				'authorization': this.API_KEY,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
			    "input": {
					"prompt": prompt,
					"sampling_params": {
					   "max_tokens": 4096,
					   "n": 1,
					   "frequency_penalty": 0.01,
					   "temperature": 0.95,
					}
			    }
			})
		});
		const result = await response.json()

		const textResponse = result['output']['text'][0]
		if (json) {
			let jsonResponse;
			try {
				jsonResponse = JSON.parse(textResponse)
			} catch(e) {
				console.log("JSON parsing failed")
				console.log(textResponse)
				const indexStart = textResponse.indexOf("{")
				const indexEnd = textResponse.indexOf("}") + 1
				try {
					jsonResponse = JSON.parse(textResponse.slice(indexStart, indexEnd))
				} catch(e) {
					console.log(e)
					jsonResponse = null
				}
			}
			return jsonResponse;
		} else {
			return textResponse;
		}
	}

	getPromptForProfileSummary(profileInfo) {
		let profileInfoPrompt = []
		if (profileInfo.nameText) {
			profileInfoPrompt.push("NAME: " + profileInfo.nameText)
		}
		if (profileInfo.jobTitle) {
			profileInfoPrompt.push("JOB TITLE: " + profileInfo.jobTitle)
		}
		if (profileInfo.pastExperience) {
			profileInfoPrompt.push("PAST EXPERIENCE: " + profileInfo.pastExperience)
		}
		if (profileInfo.education) {
			profileInfoPrompt.push("EDUCATION: " + profileInfo.education)
		}
		if (profileInfo.skills) {
			profileInfoPrompt.push("SKILLS: " + profileInfo.skills.join(", "))
		}
		if (profileInfo.awards) {
			profileInfoPrompt.push("AWARDS: " + profileInfo.awards.join(", "))
		}
		if (profileInfo.interests) {
			profileInfoPrompt.push("INTERESTS: " + profileInfo.interests.join(", "))
		}

		return `
			[INST]
			<<SYS>>
			You are a dating profile generating bot. Your role is to analyze information from a person's resume and generate a short paragraph describing this person as if it was their dating profile. 

			You must follow the instruction below:
			- You must determine this person's dating marketplace value based on their resume
			- You must write their dating profile summary as if you were them
			- Act as if you're pitching yourself to a prospective date for a relationship 
			<</SYS>>

			Here is the resume information of this person:

			${profileInfoPrompt.join("\n")}
			[/INST]
		`.trim()
	}

	getPromptForGendering(name) {
		return `
			[INST]
			<<SYS>>
			You are a bot that guesses gender based on a name
			- You will be given a name after the keyword "NAME:"
			- You must read the name and guess what gender the person is based on that name
			- if the gender is male respond with "MALE" in all caps
			- if the gender is female respond with "FEMALE" in all caps
			- Only respond with the gender in all caps do not respond with anything else.
			<</SYS>>
			NAME: ${name}
			[/INST]
		`.trim()
	}

	getPromptForMatching(profileSummary1, profileSummary2) {
		return `
			[INST]
			<<SYS>>
			You are a relationships and dating specialist bot. Your role is look at two different dating profiles and respond with a number from 1 to 10 on whether or not these two match.

			You must follow the instructions below:
			- Will be given the 2 profiles under the keywords "PROFILE 1:" and "PROFILE 2:"
			- You must analyze each profile and find common interests and reasons for compatibility between the two profiles.
			- If you find there are possible issues with compatibility lower your score.
			- A score under 5 is a score where these two should not date.
			- A score over 5 is a score where these two SHOULD date.
			- ONLY respond with your number from 1-10 do not respond with anything else.
			
			<</SYS>>
			PROFILE 1: ${profileSummary1}
			PROFILE 2: ${profileSummary2}
			[/INST]
		`.trim()
	}

	getPromptForDMRizz(profileSummary) {
		return `
			[INST]
			<<SYS>>
			You are a dating app opener line generator bot.

			You will be given the summary of a dating profile. You must reply with an opening line to be used to open communication with the person behind the profile.

			Keep your opener line simple and sweet, do not be weird at all. Be business professional in your language and try to mention something related to the person's life/career/interests.

			Try to be a little bit funny and light as if you're a relaxed, normal person.

			Just be cool!

			Remember, you must ONLY reply with the dating opener line that you choose			
			<</SYS>>

			PROFILE: ${profileSummary}
			[/INST]
		`.trim()
	}
}

module.exports = LLM;