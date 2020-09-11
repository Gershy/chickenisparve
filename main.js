window.addEventListener('load', () => {
  
  console.log('FEEX');
  document.body.style.opacity = '';
  document.body.style.pointerEvents = '';
  
  window.addEventListener('beforeunload', () => {
    document.body.style.opacity = '0';
    document.body.style.pointerEvents = 'none';
  });
  
});
