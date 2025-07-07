document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;

  if (!url.includes("youtube.com/watch")) {
    document.getElementById("status").textContent = "Not a YouTube video.";
    return;
  }

  document.getElementById("status").textContent = "YouTube video detected.";
  document.getElementById("save").style.display = "block";

  // Extract video ID for saving
  const videoId = new URL(url).searchParams.get("v");
  const storageKey = "bookmarks_" + videoId;

  function loadAllBookmarks() {
    chrome.storage.local.get(null, (result) => {
      const ul = document.getElementById("bookmarks");
      ul.innerHTML = "";
      const allKeys = Object.keys(result).filter((k) => k.startsWith("bookmarks_"));
      let total = 0;

      allKeys.forEach((key) => {
        const bookmarks = result[key] || [];
        bookmarks.forEach((b, index) => {
          total++;
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = "#";
          a.textContent = b.title + " [" + formatTime(b.time) + "]";
          a.addEventListener("click", () => {
            chrome.tabs.update(tab.id, { url: b.url });
          });

          const delBtn = document.createElement("button");
          delBtn.textContent = "❌";
          delBtn.addEventListener("click", () => {
            // Remove bookmark
            bookmarks.splice(index, 1);
            if (bookmarks.length === 0) {
              chrome.storage.local.remove(key, loadAllBookmarks);
            } else {
              chrome.storage.local.set({ [key]: bookmarks }, loadAllBookmarks);
            }
          });

          li.appendChild(a);
          li.appendChild(delBtn);
          ul.appendChild(li);
        });
      });

      if (total === 0) {
        ul.innerHTML = "<li>No bookmarks saved.</li>";
      }
    });
  }

  loadAllBookmarks();

  document.getElementById("save").addEventListener("click", async () => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const video = document.querySelector("video");
          return video ? Math.floor(video.currentTime) : null;
        }
      },
      (results) => {
        const time = results[0].result;
        if (time === null) {
          alert("Could not get video timestamp.");
          return;
        }

        const bookmark = {
          time: time,
          url: url.split("&")[0] + "&t=" + time + "s",
          title: tab.title
        };

        chrome.storage.local.get([storageKey], (result) => {
          const bookmarks = result[storageKey] || [];
          bookmarks.push(bookmark);
          chrome.storage.local.set({ [storageKey]: bookmarks }, loadAllBookmarks);
        });
      }
    );
  });
});

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}