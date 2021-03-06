window.addEventListener('load', () => {
  
  document.body.style.opacity = '';
  document.body.style.pointerEvents = '';
  
  window.addEventListener('beforeunload', () => {
    document.body.style.opacity = '0';
    document.body.style.pointerEvents = 'none';
  });
  
  let pages = [ ...document.querySelectorAll('body > .page') ];
  
  let parallax = () => {
    
    let { height: bodyHeight } = document.body.getBoundingClientRect();
    
    let scrollAmt = document.body.scrollTop;
    let viewH = window.innerHeight;
    let pageInd = Math.round(scrollAmt / viewH);
    let focusAmt = 2 * (scrollAmt / viewH - pageInd);
    
    let curPage = pages[pageInd];
    let otherPage = pages[pageInd + ((focusAmt > 0) ? +1 : -1)] || null;
    
    for (let page of pages) {
      page.style.opacity = '0';
      page.style.zIndex = '-1';
      page.style.pointerEvents = 'none';
      page.classList.remove('active');
    }
    curPage.style.opacity = '1';
    curPage.style.zIndex = '-2';
    curPage.style.pointerEvents = 'all';
    curPage.classList.add('active');
    
  };
  
  document.body.addEventListener('scroll', parallax);
  window.addEventListener('resize', parallax);
  parallax();
  
});
