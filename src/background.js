let callingUrl = '';

function handleMessage(request, sender, sendResponse) {
  console.log('Request received');
  if (request.request === 'url') {
    sendResponse({ url: callingUrl });
  }
}

chrome.runtime.onMessage.addListener(handleMessage);

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) {
    console.error("Cannot read tab URL. Check 'tabs' permission.");
    return;
  }

  const url = new URL(tab.url);
  const matchPattern = `${url.protocol}//${url.hostname}/*`;

  try {
    const granted = await chrome.permissions.request({
      origins: [matchPattern]
    });

    if (granted) {
      console.log("Access granted to:", matchPattern);
      chrome.tabs.create({url: "/index.html"});
      callingUrl = tab.url;
    } else {
      console.log("Access denied to:", matchPattern);
    }
  } catch (error) {
    console.error("Permission request failed:", error);
  }
});
