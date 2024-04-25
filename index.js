document.getElementById("uploadForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file.");
    return;
  }
  const videoName = file.name;
  const formData = new FormData();
  formData.append("file", file);
  console.log(videoName)
  const url = `https://5t1mdxva4c.execute-api.us-east-1.amazonaws.com/vig-UploadVideoFile?videoName=${encodeURIComponent(videoName)}`;

  const response = await fetch(url, {
    method: "GET",
  });
  const data = await response.json();
  const presignedUrl = data.url;
  console.log(presignedUrl)

  // Upload file directly to S3 using presigned URL
  const uploadResponse = await fetch(presignedUrl, {
    method: "PUT",
    body: file
  });

  if (uploadResponse.ok) {
    alert("File uploaded successfully!");
  } else {
    console.error("Failed to upload file:", uploadResponse.statusText);
    alert("Failed to upload file.");
  }
})


const descriptions = [
  "Generates summary reports from uploaded videos.",
  "Uses anthropic claude model for summarization.",
  "Utilizes AWS Transcribe for transcription and PDF generation."
];

const descriptionElement = document.getElementById("description");

let index = 0;

const typeWriter = () => {
  const currentDescription = descriptions[index];
  let i = 0;
  const typingInterval = setInterval(() => {
    if (i < currentDescription.length) {
      descriptionElement.textContent += currentDescription.charAt(i);
      i++;
    } else {
      clearInterval(typingInterval);
      setTimeout(() => eraseText(currentDescription.length), 3000); // Wait for 2 seconds before erasing text
    }
  }, 50); // Typing speed
};

const eraseText = (length) => {
  const eraseInterval = setInterval(() => {
    if (descriptionElement.textContent.length > 0) {
      descriptionElement.textContent = descriptionElement.textContent.slice(0, -1);
    } else {
      clearInterval(eraseInterval);
      index = (index + 1) % descriptions.length; // Move to the next description in a circular manner
      typeWriter();
    }
  }, 20); // Erasing speed
};

typeWriter(); // Start the typewriter effect


