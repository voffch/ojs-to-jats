# What

This is a browser extension for generating [JATS XML](https://en.wikipedia.org/wiki/Journal_Article_Tag_Suite) metadata descriptions for the articles published with [Open Journal Systems](https://docs.pkp.sfu.ca/learning-ojs/about-ojs/) (OJS). The resulting JATS can be submitted via API to the Russian [Metafora](https://metafora.rcsi.science/) database.

The application will unlikely be of any use outside Russia, so the entire thing is in Russian.

Why the browser extension and not a simple webpage? Because I wanted this app to run locally, without the backend server, in the client's browser (leveraging the data fetching and parsing capabilities available in modern web browsers), and because a simple web page running the client-side javascript cannot access arbitrary (OJS) webpages due to the cross-domain request restrictions (see, e.g., [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)). Extensions are allowed to do that, and this extension explicitly asks the user permissions to access specific domains.

## How to build

The extension is written for Firefox using [vite](https://vite.dev/) bundler and [vue.js](https://vuejs.org/) frontend library. Ensure you have the latest [Node](https://nodejs.org) installed and run this from this folder:

```bash
npm i && npm run build
```

The unpacked extension will be located in the `dist` folder.

### For Chrome-based browsers

Install Firefox. Seriously. If you insist on using Chrome, try replacing the `"scripts": ["background.js"],` line with `"service_worker": "background.js",` in `manifest.json`. This hasn't been tested extensively though. You are on your own.

## About JATS

The detailed description of the Journal Article Tag Suite (JATS) v. 1.4 format can be found [here in the tag library](https://jats.nlm.nih.gov/archiving/tag-library/1.4/). To check the XML use the [XML validator](https://jats4r-validator.niso.org/) developed with JATS4R, which is the stricter subset of JATS, in mind.

## Getting the data from OJS

This can be done (and is done, by this extension) in several ways:

### Via the OJS API

This is the most reliable and preferred way. There's even some documentation: the API is described on the developers' website ([OJS 3.3](https://docs.pkp.sfu.ca/dev/api/ojs/3.3), [OJS 3.4](https://docs.pkp.sfu.ca/dev/api/ojs/3.4)). The API is available for OJS 3.1+, and it is only accessible for the logged-in users OR via the API key given that CORS doesn't restrict your requests to the API endpoints.

For our intents and purposes, the most useful endpoints here are: `/submissions/{submissionId}` and `/submissions/{submissionId}/publications/{publicationId}` to get the data for the particular article, and `/issues` and `/issues/{issueId}` to get the issue listing(s).

The API interface allows fetching multilingual metadata simultaneously.

Unfortunately, the descriptions of the journal, such as the journal name and ISSNs, are only accessible via, e.g., `/contexts/{contextId}`, which is only exposed to journal managers and site admins. These access rights are overkill for our purpose. Alas! We can't avoid parsing the website.

### By parsing the webpage

To get the multilingual data, at least two web page requests are required: the first one to fetch the data in the current language, and the second - to switch the language and fetch the new data. The third request serves to switch the website language back. The language-switching hacks don't currently work for OJS 3.5, because they ~~broke~~changed the routing in multilingual journals.

#### From the metadata

Three separate plugins enable the metadata fields in the article pages in OJS.

OpenURL ([wiki](https://en.wikipedia.org/wiki/OpenURL)) is an [ANSI/NISO standard](https://www.niso.org/publications/z3988-2004-r2010) for encoding metadata in URLs. In OJS, OpenURL metadata descriptor appears in the article page code as a [COinS](https://en.wikipedia.org/wiki/COinS), in the title of the `<span class="Z3988" title="..."></span>` element when the **COinS Plugin** is enabled.

Dublin Core ([wiki](https://en.wikipedia.org/wiki/Dublin_Core)) is another international standard for describing records. In OJS, the Dublin-Core-specific meta tags are enabled by turning on the **Dublin Core Indexing Plugin**.

Highwire Press tags, a.k.a. [Google Scholar tags](https://scholar.google.com/intl/en/scholar/inclusion.html#indexing) (see also [this](https://docs.pkp.sfu.ca/google-scholar/en/)) is the set of meta tags somewhat similar to Dublin Core. These tags aid in the Google Scholar indexing. They are enabled by the **Google Scholar Indexing Plugin**.

#### From the webpage \<body>

This is the most unreliable way. The htmls are not standardized, they differ between OJS versions, and may be modified via the OJS plugins, mods and dirty hacks. Besides, the html code of OJS 2.x is semantically poor and hard to work with. Unfortunately, there's no API for OJS < 3.1, so we have what we have. Something is better than nothing, innit?

## Fun stuff

[Doctorow on metadata in general](https://people.well.com/user/doctorow/metacrap.htm)