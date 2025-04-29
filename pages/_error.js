// Absolute minimal error page with no dependencies to avoid React Error #130
function CustomError({ statusCode }) {
  return (
    <html>
      <head>
        <title>{statusCode || "Error"} - BCL Appointments</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            display: flex;
            min-height: 100vh;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0 1rem;
          }
          h1 {
            font-size: 4rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          h2 {
            font-size: 1.5rem;
            font-weight: 500;
            margin-bottom: 1rem;
          }
          p {
            color: #6b7280;
            margin-bottom: 2rem;
          }
          .button {
            background-color: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.25rem;
            font-weight: bold;
            text-decoration: none;
            transition: background-color 150ms;
          }
          .button:hover {
            background-color: #2563eb;
          }
        `}} />
      </head>
      <body>
        <div className="container">
          <h1>{statusCode || "Error"}</h1>
          <h2>{statusCode === 404 ? "Page Not Found" : "Something went wrong"}</h2>
          <p>
            {statusCode === 404
              ? "We couldn't find the page you were looking for."
              : "Sorry, something went wrong on our server."}
          </p>
          <a href="/" className="button">Go Home</a>
        </div>
      </body>
    </html>
  );
}

// Generate the error code server-side
CustomError.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default CustomError;
