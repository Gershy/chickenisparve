let addClass = (elem, cls) => elem.classList.contains(cls) || elem.classList.add(cls);
let remClass = (elem, cls) => elem.classList.contains(cls) && elem.classList.remove(cls);

window.addEventListener('load', () => {
  
  document.body.style.opacity = '';
  document.body.style.pointerEvents = '';
  
  window.addEventListener('beforeunload', () => {
    document.body.style.opacity = '0';
    document.body.style.pointerEvents = 'none';
  });
  
  // Disable pointer-events during scroll (smoother performance)
  let scrollTimeout = null;
  document.body.addEventListener('scroll', () => {
    addClass(document.body, 'scrolling');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => remClass(document.body, 'scrolling'), 150);
  });
  
  let pages = [ ...document.querySelectorAll('body > .page') ]
    .map(page => page.getBoundingClientRect().height > 0 ? page : null)
    .filter(Boolean);
  
  let parallax = () => {
    
    let { height: bodyHeight } = document.body.getBoundingClientRect();
    
    let { pageInd, focusAmt } = (() => {
      
      let windowVMid = window.innerHeight * 0.5; //document.body.scrollTop;
      for (let i = 0; i < pages.length; i++) {
        
        let page = pages[i];
        let { top, bottom, height } = page.getBoundingClientRect();
        
        let amtAbove = windowVMid - top;    // The number of px `page` sticks above the middle of the screen
        let amtBelow = bottom - windowVMid; // The number of px `page` sticks below the middle of the screen
        
        if (amtAbove >= 0 && amtBelow >= 0) return { pageInd: i, focusAmt: amtBelow - amtAbove };
        
      }
      
      return { pageInd: pages.length - 1, focusAmt: -0.1 };
      
    })();
    
    let curPage = pages[pageInd];
    let otherPage = pages[pageInd + ((focusAmt > 0) ? +1 : -1)] || null;
    
    for (let page of pages) ((page === curPage) ? addClass : remClass)(page, 'active');
    
  };
  document.body.addEventListener('scroll', parallax);
  window.addEventListener('resize', parallax);
  parallax();
  
});
