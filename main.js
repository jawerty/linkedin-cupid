/*
You enter a linkedin profile
........It does stuff and then outputs linkedin profiles that are dating matches


How we're going to do this

THE BUILD: LinkedIn Dating Matchmaker AI

Technologies:

Node.js
Puppeteer - Browser Automation
Llama 2 - Runpod.io endpoints 
	- PROMPT Llama 2 to do our matching


How we're gonna do it
- We need to scrape the prospect's data
	- Make a summary using their linkedin Profile

- We need to search LinkedIn for profiles check if it's right gender
- Gather x amount of profiles and do a tournament style filtering
	- Buckets of 10 or so profiles. Compare each using the LLM to see which matches with the prospect more
	......and then eventually we'll have a champion (a match) for each bucket
	- 100 profiles to check if they're the right dating match
		get 10, compare each until we get 1 and do this for each 10
		
		100 > 10 buckets > 10 profiles > 1 bucket > 1 profile
*/
const fs = require("fs");

const LLM = require("./lib/LLM");

const { timeout, setupBrowser, linkedInLogin, loadCookies } = require('./utils');

// ERRBODIES STRAIGHT
// const datingProspectProfile = "https://www.linkedin.com/in/benjamin-kenobi-7173002a9/";
const datingProspectProfile = "https://www.linkedin.com/in/jawerty/"
const datingProspectGender = "male";

const oppositeGender = datingProspectGender === "male" ? "female" : "male";

// GENERIC (both prospect and matches)
async function getProfileInfo(page) {
	await page.waitForSelector(".pv-text-details__about-this-profile-entrypoint")
	
	// name
	const nameText = await page.evaluate(() => {
		return document.querySelector(".pv-text-details__about-this-profile-entrypoint")?.innerText
	})

	// current job title
	const jobTitle = await page.evaluate(() => {
		return document.querySelector(".pv-text-details__about-this-profile-entrypoint").closest("div")?.nextElementSibling?.innerText
	});

	// past experience
	const pastExperience =  await page.evaluate(() => {
		const experienceText = document.querySelector('#experience ~ .pvs-list__outer-container [data-view-name="profile-component-entity"] .display-flex.full-width')?.innerText
		if (experienceText) {
			return experienceText.split('\n').filter((val, i) => {
				return i % 2 == 0
			}).join("\n");
		}
	});

	// education
	const education = await page.evaluate(() => {
		return document.querySelector('#education ~ .pvs-list__outer-container [data-view-name="profile-component-entity"] .display-flex.full-width')?.innerText
	});

	// skills
	const skills = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("[data-field=\"skill_card_skill_topic\"] span[aria-hidden=\"true\"]")).map((el) => el.innerText)
	});

	// honors and awards
	const awards = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('#honors_and_awards ~ .pvs-list__outer-container [data-view-name="profile-component-entity"] div.t-bold span[aria-hidden]')).map((el) => el.innerText)
	})

	// *limited* interests
	const interests = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('#interests ~ .artdeco-tabs [data-view-name="profile-component-entity"] div.t-bold span[aria-hidden]')).map((el) => el.innerText)
	});

	return {
		nameText,
		jobTitle,
		pastExperience,
		education,
		skills,
		awards,
		interests
	}
}

async function summarizeDatingProfile(profileInfo) {
	// prompt llama2 (using runpod)
	const llm = new LLM()
	const prompt = llm.getPromptForProfileSummary(profileInfo)

	return await llm.llama2Request(prompt, false)
}

async function getProfilesToMatch(page, limit, profileInfo) {
	const llm = new LLM()
	
	let pageNum = 1;

	const matchingProfiles = []

	while (matchingProfiles.length < limit) {
		await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(profileInfo.jobTitle)}&origin=SWITCH_SEARCH_VERTICAL&page=${pageNum}&sid=rQi`)
	
		await page.waitForSelector('.entity-result__title-text.t-16', { timeout: 60000 })
		
		const profiles = await page.evaluate(() => {
		
			const nameElements = document.querySelectorAll(".entity-result__title-text.t-16 .app-aware-link span[aria-hidden]")
			return Array.from(nameElements).map((nameEl) => {
				return {
					name: nameEl.innerText,
					profileLink: nameEl.closest('a').href
				}
			})
		});

		for (let profile of profiles) {
			const prompt = llm.getPromptForGendering(profile.name)
			
			const response = await llm.llama2Request(prompt, false)
			console.log("matching profile", profile.name, response)

			const isFemale = response.toLowerCase().includes("female")
			if ((isFemale && oppositeGender === "female")
				||
				(!isFemale && oppositeGender === "male")) {
				matchingProfiles.push(profile)
				console.log("is match")
			}
		}
	
		pageNum++
	}

	return matchingProfiles
}

async function rizzGenerator(profileSummary) {
	const llm = new LLM();
	const prompt = llm.getPromptForDMRizz(profileSummary)
	return await llm.llama2Request(prompt, false)
}

async function main() {
	const config = JSON.parse(fs.readFileSync('config.json'));

	const [browser, page] = await setupBrowser()

	await linkedInLogin(page, config)

	await page.goto(datingProspectProfile);

	const profileInfo = await getProfileInfo(page)
	
	console.log(profileInfo);

	const prospectProfileSummary = await summarizeDatingProfile(profileInfo)
	console.log(prospectProfileSummary)

	const matchingProfiles = await getProfilesToMatch(page, 3, profileInfo);
	console.log(matchingProfiles)

	const matches = [];

	for (let match of matchingProfiles) {
		await page.goto(match.profileLink)
		const matchProfileInfo = await getProfileInfo(page)
		const matchProfileSummary = await summarizeDatingProfile(matchProfileInfo)
		
		const llm = new LLM();
		const prompt = llm.getPromptForMatching(prospectProfileSummary, matchProfileInfo)
		let response = await llm.llama2Request(prompt, false)
 		if (response.includes('/10')) {
 			response = response.replaceAll("/10", "").trim()
 		}

 		console.log("MATCH RESPONSE:", response)
 		const responseNumber = parseInt(response);
 		matches.push({
 			score: responseNumber,
 			profileSummary: matchProfileSummary,
 			name: match.name
 		});
	}

	console.log(matches);
	console.log("\n\nYOUR TOP 3:\n\n")
	const topMatches = matches.sort((a, b) => {
		return b.score - a.score
	}).slice(0, 3);
	
	const matchProfileSummary = topMatches[0].profileSummary
	const introRizz = await rizzGenerator(matchProfileSummary)
	console.log("\n\nYOUR RIZZ:\n\n", introRizz)
}


main()
