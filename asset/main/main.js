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
    
    let scrollAmt = document.documentElement.scrollTop;
    let viewH = window.innerHeight;
    let pageInd = Math.round(scrollAmt / viewH);
    let focusAmt = -2 * (pageInd - (scrollAmt / viewH));
    
    // let prevPage = (pageInd > 0) ? pages[pageInd - 1] : null;
    // let currPage = pages[pageInd];
    // let nextPage = (pageInd < pages.length - 1) ? pages[pageInd + 1] : null;
    
    let curPage = pages[pageInd];
    let otherPage = (focusAmt > 0)
      ? (pages[pageInd + 1] || null)
      : (pages[pageInd - 1] || null);
    
    console.log(pageInd, focusAmt);
    
    for (let page of pages) { page.style.opacity = '0'; page.style.zIndex = '2'; }
    
    curPage.style.opacity = 1;
    curPage.style.zIndex = 1;
    
    //if (otherPage) {
    //  otherPage.style.opacity = Math.abs(focusAmt);
    //  otherPage.style.zIndex = 2;
    //}
    
    //currPage.style.zIndex = '1';
    //[ prevPage, nextPage ].forEach(page => page && (page.style.zIndex = '2'));
    
    //for (let { page, amt } of pageAmts) {
    //  if (!page) continue;
    //  page.style.opacity = `${amt}`;
    //}
    //
    //console.log(pageInd + ' (' + focusAmt.toFixed(2) + '); ' + pages.map(p => p.style.opacity).join(', '));
    
    //console.log(`${pageInd + 1} / ${pages.length} (${(pageAmt * 100).toFixed(2)}%)`);
  };
  
  document.addEventListener('scroll', parallax);
  parallax();
  
});
