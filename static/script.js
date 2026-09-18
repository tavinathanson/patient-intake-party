// Client-side enhancements for Patient Intake Form

document.addEventListener('DOMContentLoaded', () => {
  // Allergies input coordination
  const allergiesNoneCheckbox = document.getElementById('allergies_none');
  const allergiesTextInput = document.getElementById('allergies');

  if (allergiesNoneCheckbox && allergiesTextInput) {
    allergiesNoneCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        allergiesTextInput.value = '';
        allergiesTextInput.setAttribute('disabled', 'disabled');
      } else {
        allergiesTextInput.removeAttribute('disabled');
      }
    });

    allergiesTextInput.addEventListener('input', (e) => {
      if (e.target.value.trim().length > 0 && allergiesNoneCheckbox.checked) {
        allergiesNoneCheckbox.checked = false;
      }
    });

    // Initial state check
    if (allergiesNoneCheckbox.checked) {
      allergiesTextInput.setAttribute('disabled', 'disabled');
    }
  }
});

// Copy JSON to clipboard
function copyJsonPayload() {
  const jsonElement = document.getElementById('json-content');
  const copyBtn = document.getElementById('copy-json-btn');
  
  if (!jsonElement) return;

  navigator.clipboard.writeText(jsonElement.innerText).then(() => {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'Copied! ✓';
    copyBtn.classList.remove('secondary');
    copyBtn.classList.add('contrast');
    
    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.classList.remove('contrast');
      copyBtn.classList.add('secondary');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy JSON: ', err);
  });
}

// Download JSON payload file
function downloadJsonPayload() {
  const jsonElement = document.getElementById('json-content');
  if (!jsonElement) return;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonElement.innerText);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "patient-intake.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
