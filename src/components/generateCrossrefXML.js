// https://gitlab.com/crossref/schema/-/blob/master/schemas/crossref4.4.2.xsd

function createXmlWrapper() {
	const parser = new DOMParser();
	const xml  = parser.parseFromString(`<?xml version="1.0" encoding="utf-8"?>
		<doi_batch xmlns="http://www.crossref.org/schema/4.4.2"
			xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
			xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1"
			xmlns:ai="http://www.crossref.org/AccessIndicators.xsd"
      xmlns:fr="http://www.crossref.org/fundref.xsd"
			version="4.4.2"
			xsi:schemaLocation="http://www.crossref.org/schema/4.4.2 https://www.crossref.org/schemas/crossref4.4.2.xsd">
		</doi_batch>`, "application/xml");
	return xml;
}

export default function generateCrossrefXML(heads, metas) {
	const xml = createXmlWrapper();
	const doi_batch = xml.getElementsByTagName('doi_batch')[0];
	const ns = doi_batch.namespaceURI;
	const jats = "http://www.ncbi.nlm.nih.gov/JATS1";
	const ai = "http://www.crossref.org/AccessIndicators.xsd";
  const fr = "http://www.crossref.org/fundref.xsd";

	function makePublicationDate(dateText, mediaType='online', dateType='publication') {
    if (!dateText) return null;
		const publication_date = xml.createElementNS(ns, `${dateType}_date`);
		publication_date.setAttribute('media_type', mediaType);
    const date_parts = dateText.split('-');
    let day = null;
    let month = null;
    let year = null;
    switch(date_parts.length) {
      case 1:
        year = xml.createElementNS(ns, 'year');
        year.textContent = date_parts[0];
        break;
      case 2:
        month = xml.createElementNS(ns, 'month');
        month.textContent = date_parts[1];
        year = xml.createElementNS(ns, 'year');
        year.textContent = date_parts[0];
        break;
      case 3:
        day = xml.createElementNS(ns, 'day');
        day.textContent = date_parts[2];
        month = xml.createElementNS(ns, 'month');
        month.textContent = date_parts[1];
        year = xml.createElementNS(ns, 'year');
        year.textContent = date_parts[0];
        break;
      default:
        break;
    }
    for (const child of [month, day, year]) {
      if (child !== null) {
        publication_date.appendChild(child);
      }
    }
    return publication_date;
	}

	const head = xml.createElementNS(ns, 'head');
	doi_batch.appendChild(head);
		const doi_batch_id = xml.createElementNS(ns, 'doi_batch_id');
    // let's not use the timestamp in doi_batch_id to ensure its uniqueness
		doi_batch_id.textContent = 'MADE_FROM_JATS_' + (new Date()).getTime().toString();
		head.appendChild(doi_batch_id);
		const timestamp = xml.createElementNS(ns, 'timestamp');
		timestamp.textContent = heads['timestamp'].toString();
		head.appendChild(timestamp);
		const depositor = xml.createElementNS(ns, 'depositor');
			const depositor_name = xml.createElementNS(ns, 'depositor_name');
			depositor_name.textContent = heads['depositor_name'];
			depositor.appendChild(depositor_name);
			const email_address = xml.createElementNS(ns, 'email_address');
			email_address.textContent = heads['email_address'];
			depositor.appendChild(email_address);
		head.appendChild(depositor);
		const registrant = xml.createElementNS(ns, 'registrant');
		registrant.textContent = heads['registrant'];
		head.appendChild(registrant);

	const body = xml.createElementNS(ns, 'body');
	doi_batch.appendChild(body);

	for (const meta of metas) {
    const ameta = meta['article'];
    const jmeta = meta['journal'];
    const journal = xml.createElementNS(ns, 'journal');
    body.appendChild(journal);
    const article_parent = journal;
    const journal_metadata = xml.createElementNS(ns, 'journal_metadata');
    journal.appendChild(journal_metadata);
      const full_title = xml.createElementNS(ns, 'full_title'); // *
      full_title.textContent = jmeta.titles.en;
      let eissn = null;
      if (jmeta.eissn) {
        eissn = xml.createElementNS(ns, 'issn');
        eissn.setAttribute('media_type', 'electronic');
        eissn.textContent = jmeta.eissn;
      }
      let issn = null;
      const issnText = jmeta.issn;
      if (issnText) {
        issn = xml.createElementNS(ns, 'issn');
        issn.setAttribute('media_type', 'print');
        issn.textContent = issnText;
      }
      for (const child of [full_title, eissn, issn]) {
        if (child) {
          journal_metadata.appendChild(child);
        }
      }
    const journal_issue = xml.createElementNS(ns, 'journal_issue');
    journal.appendChild(journal_issue);
      // *
      // at least one issue publication date is required!
      const epublication_date = makePublicationDate(heads['epublication_date'], 'online');
      const publication_date = makePublicationDate(heads['publication_date'], 'print');
      let journal_volume = null;
      if (ameta.volume) {
        journal_volume = xml.createElementNS(ns, 'journal_volume');
        const volume = xml.createElementNS(ns, 'volume');
        journal_volume.appendChild(volume);
        volume.textContent = ameta.volume;
      }
      let issue = null;
      if (ameta.issue) {
        issue = xml.createElementNS(ns, 'issue');
        issue.textContent = ameta.issue;
      }
      for (const child of [epublication_date, publication_date, journal_volume, issue]) {
        if (child) {
          journal_issue.appendChild(child);
        }
      }

		const journal_article = xml.createElementNS(ns, 'journal_article');
		article_parent.appendChild(journal_article);
		journal_article.setAttribute('publication_type', 'full_text');
		journal_article.setAttribute('reference_distribution_opts', 'any');
			const titles = xml.createElementNS(ns, 'titles'); // *
				const title = xml.createElementNS(ns, 'title');
				titles.appendChild(title);
				title.textContent = ameta.titles.en; // TODO: html
      let contributors = null;
      if (ameta.authors.length) {
        contributors = xml.createElementNS(ns, 'contributors');
        for (const [index, author] of ameta.authors.entries()) {
          const person_name = xml.createElementNS(ns, 'person_name');
          person_name.setAttribute('contributor_role', 'author');
          person_name.setAttribute('sequence', index ? 'additional' : 'first');
          if (author.val.givennames.en) {
            const given_name = xml.createElementNS(ns, 'given_name');
            given_name.textContent = author.val.givennames.en;
            person_name.appendChild(given_name);
          }
          const surname = xml.createElementNS(ns, 'surname'); // *
          surname.textContent = author.val.surnames.en;
          person_name.appendChild(surname);
          for (const aff of ameta.affiliations) {
            if (author.val.affIds.includes(aff.id)) {
              const affiliation = xml.createElementNS(ns, 'affiliation');
              affiliation.textContent = aff.val.en;
              person_name.appendChild(affiliation);
            }
          }
          if (author.val.orcid) {
            const orcid = xml.createElementNS(ns, 'ORCID');
            orcid.textContent = author.val.orcid;
            person_name.appendChild(orcid);
          }
          contributors.appendChild(person_name);
        }
      }
      let abstract = null;
      if (ameta.abstracts.en) {
        abstract = xml.createElementNS(jats, 'abstract');
        const p = xml.createElementNS(jats, 'p');
        abstract.appendChild(p);
        p.textContent = ameta.abstracts.en;//.replace(/\r?\n|\r/g, " ").trim(); // TODO: html
      }
      // at least one publication date is required for the article as well
			const epublication_date_article = makePublicationDate(ameta.datePublished, 'online'); // *
			const publication_date_article = makePublicationDate(heads['publication_date'], 'print');
      let acceptance_date = null;
      if (ameta.dateAccepted) {
        acceptance_date = makePublicationDate(ameta.dateAccepted, 'online', 'acceptance');
      }
      let pages = null;
      if (ameta.pages) {
        if (!ameta.useElocationId) {
          pages = xml.createElementNS(ns, 'pages');
          const pageParts = ameta.pages.split('-');
          const first_page = xml.createElementNS(ns, 'first_page');
          pages.appendChild(first_page);
          first_page.textContent = pageParts[0];
          if (pageParts.length > 1) {
            const last_page = xml.createElementNS(ns, 'last_page');
            pages.appendChild(last_page);
            last_page.textContent = pageParts[1];
          }
        } else {
          pages = xml.createElementNS(ns, 'publisher_item');
          const item_number = xml.createElementNS(ns, 'item_number');
          item_number.setAttribute('item_number_type', 'article_number');
          item_number.textContent = ameta.pages
          pages.appendChild(item_number);
        }
      }
      // it's probably not strictly correct to include everything within funder_name
      // but one can nevertheless try
      let fr_program = null;
      if (ameta.fundings.en) {
        fr_program = xml.createElementNS(fr, 'program');
        fr_program.setAttribute('name', 'fundref');
        const assertion = xml.createElementNS(fr, 'assertion');
        assertion.setAttribute('name', 'funder_name');
        assertion.textContent = ameta.fundings.en;
        fr_program.appendChild(assertion);
      }
      let ai_program = null;
      if (ameta.licenseUrl) {
        ai_program = xml.createElementNS(ai, 'program');
        ai_program.setAttribute('name', 'AccessIndicators');
        const license_ref = xml.createElementNS(ai, 'license_ref');
        ai_program.appendChild(license_ref);
        license_ref.textContent = ameta.licenseUrl;
      }
			const doi_data = xml.createElementNS(ns, 'doi_data');
				const doi = xml.createElementNS(ns, 'doi');
				doi.textContent = ameta.doi;
				const resource = xml.createElementNS(ns, 'resource');
				resource.textContent = ameta.pageUrl;
				let collection_crawler = null;
				let collection_mining = null;
				if (ameta.pdfUrl) {
					collection_crawler = xml.createElementNS(ns, 'collection');
					collection_crawler.setAttribute('property', 'crawler-based');
						const item_crawler = xml.createElementNS(ns, 'item');
						collection_crawler.appendChild(item_crawler);
						item_crawler.setAttribute('crawler', 'iParadigms');
							const resource_crawler = xml.createElementNS(ns, 'resource');
							item_crawler.appendChild(resource_crawler);
							resource_crawler.textContent = ameta.pdfUrl;
					collection_mining = xml.createElementNS(ns, 'collection');
					collection_mining.setAttribute('property', 'text-mining');
						const item_mining = xml.createElementNS(ns, 'item');
						collection_mining.appendChild(item_mining);
							const resource_mining = xml.createElementNS(ns, 'resource');
							item_mining.appendChild(resource_mining);
							resource_mining.setAttribute('mime_type', 'application/pdf');
							resource_mining.textContent = ameta.pdfUrl;
				}
				for (const child of [doi, resource, collection_crawler, collection_mining]) {
					if (child) {
						doi_data.appendChild(child);
					}
				}
			let citation_list = null;
			if (ameta.citations.en) {
				const doi_re = /(10[.][0-9]{4,}(?:[.][0-9]+)*\/\S*[^\s\.]{1})/i;
				citation_list = xml.createElementNS(ns, 'citation_list');
				const citationParts = ameta.citations.en.split(/\r?\n|\r/);
				for (let [index, ref] of citationParts.entries()) {
					const citation = xml.createElementNS(ns, 'citation');
					citation_list.appendChild(citation);
					citation.setAttribute('key', `ref${index + 1}`);
					const doi_matched = ref.match(doi_re);
					if (doi_matched) {
						const doi_citation = xml.createElementNS(ns, 'doi');
						doi_citation.textContent = doi_matched[0];
						citation.appendChild(doi_citation);
					}
          const unstructured_citation = xml.createElementNS(ns, 'unstructured_citation');
          unstructured_citation.textContent = ref;
          citation.appendChild(unstructured_citation);
				}
			}
			for (const child of [titles, contributors, abstract, epublication_date_article, publication_date_article, acceptance_date, pages, fr_program, ai_program, doi_data]) {
				if (child) {
					journal_article.appendChild(child);
				}
			}
			if (citation_list) {
				journal_article.appendChild(citation_list);
			}
	} //for (const meta of metas)
	return xml;
}