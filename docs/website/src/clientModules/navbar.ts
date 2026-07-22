if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('navbar-scroll');
        } else {
          navbar.classList.remove('navbar-scroll');
        }
      }
    });
  }