/* eslint-disable react/no-unescaped-entities */
// Ultra-simple 404 page without any dependencies
// This is a static error page to avoid any React error #130 during build
export default function Custom404() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 16px'
    }}>
      <h1 style={{
        fontSize: '3.75rem',
        fontWeight: 'bold',
        marginBottom: '1rem'
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '500',
        marginBottom: '1rem'
      }}>
        Page Not Found
      </h2>
      <p style={{
        color: '#666',
        marginBottom: '2rem'
      }}>
        We couldn't find the page you were looking for.
      </p>
      <a
        href="/"
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem',
          fontWeight: 'bold',
          textDecoration: 'none'
        }}
      >
        Go Home
      </a>
    </div>
  );
}
