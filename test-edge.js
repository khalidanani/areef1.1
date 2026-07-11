async function getFreeModels() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    const data = await response.json();
    
    const freeModels = data.data.filter(m => {
      // Free models usually have pricing.prompt = "0" and pricing.completion = "0"
      return m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0;
    });

    console.log(`Found ${freeModels.length} free models.`);
    
    freeModels.forEach(m => {
      console.log(`- ID: ${m.id} (Vision: ${m.architecture?.modality?.includes('image') ? 'Yes' : 'No'})`);
    });

  } catch (e) {
    console.error('Fetch error:', e);
  }
}

getFreeModels();
