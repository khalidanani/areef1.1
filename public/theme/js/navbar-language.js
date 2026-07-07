document.addEventListener('DOMContentLoaded', function () {
  const languageDropdown = document.getElementById('language-dropdown');
  
  if (!languageDropdown) return;

  fetch('/Localization/GetSupportedCultures')
    .then(response => response.json())
    .then(cultures => {
      languageDropdown.innerHTML = '';
      
      if (cultures && cultures.length > 0) {
        cultures.forEach(culture => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.className = 'dropdown-item';
          a.href = 'javascript:void(0);';
          a.setAttribute('data-locale', culture.locale);
          a.innerHTML = `<span>${culture.language}</span>`;
          
          a.addEventListener('click', function(e) {
            e.preventDefault();
            const locale = this.getAttribute('data-locale');
            const currentUrl = window.location.pathname + window.location.search;
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/Localization/SetCulture';
            
            const cultureInput = document.createElement('input');
            cultureInput.type = 'hidden';
            cultureInput.name = 'culture';
            cultureInput.value = locale;
            
            const returnUrlInput = document.createElement('input');
            returnUrlInput.type = 'hidden';
            returnUrlInput.name = 'returnUrl';
            returnUrlInput.value = currentUrl;
            
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = '__RequestVerificationToken';
            tokenInput.value = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
            
            form.appendChild(cultureInput);
            form.appendChild(returnUrlInput);
            if (tokenInput.value) {
              form.appendChild(tokenInput);
            }
            
            document.body.appendChild(form);
            form.submit();
          });
          
          li.appendChild(a);
          languageDropdown.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'text-center text-muted p-2';
        li.innerHTML = '<small>No languages available</small>';
        languageDropdown.appendChild(li);
      }
    })
    .catch(error => {
      console.error('Error loading languages:', error);
      languageDropdown.innerHTML = '<li class="text-center text-muted p-2"><small>Error loading languages</small></li>';
    });
});
