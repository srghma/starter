import { ErrorRequestHandler, Express } from "express";
import * as fs from "fs";
import { TemplateExecutor } from "lodash";
import template from "lodash/template.js";
import { resolve } from "path";

const isDev = process.env.NODE_ENV === "development";

interface ParsedError {
  message: string;
  status: number;
  code?: string;
}

function parseError(
  error: Error & {
    code?: string;
    statusCode?: number;
    status?: number;
  }
): ParsedError {
  /*
   * Because an error may contain confidential information or information that
   * might help attackers, by default we don't output the error message at all.
   * You should override this for specific classes of errors below.
   */

  if (error["code"] === "EBADCSRFTOKEN") {
    return {
      message: "Invalid CSRF token: please reload the page.",
      status: 403,
      code: error["code"],
    };
  }

  // TODO: process certain errors
  const code = error["statusCode"] || error["status"] || error["code"];
  const codeAsFloat = code ? parseInt(String(code), 10) : NaN;
  const httpCode =
    isFinite(codeAsFloat) && codeAsFloat >= 400 && codeAsFloat < 600
      ? codeAsFloat
      : 500;

  console.error("An unknown error occurred", error);
  return {
    message: "An unknown error occurred",
    status: httpCode,
  };
}

let errorPageTemplate: TemplateExecutor;
function getErrorPage({ message }: ParsedError) {
  if (!errorPageTemplate || isDev) {
    errorPageTemplate = template(
      fs.readFileSync(resolve(__dirname, "../../error.html"), "utf8")
    );
  }

  return errorPageTemplate({
    message: message
      ? String(message)
      : "Something went wrong on the webpage you visited, please try again later",
  });
}

export default function (app: Express) {
  const errorRequestHandler: ErrorRequestHandler = (error, _req, res, next) => {
    try {
      const parsedError = parseError(error);
      const errorMessageString = `ERROR: ${parsedError.message}`;
      if (res.headersSent) {
        console.error(errorMessageString);
        res.end();
        return;
      }
      res.status(parsedError.status);
      res.format({
        "application/json": function () {
          res.send({
            errors: [{ message: errorMessageString, code: parsedError.code }],
          });
        },

        "text/html": function () {
          res.send(getErrorPage(parsedError));
        },

        "text/plain": function () {
          res.send(errorMessageString);
        },

        default: function () {
          // log the request and respond with 406
          res.status(406).send("Not Acceptable");
        },
      });
    } catch (e: any) {
      next(e);
    }
  };
  app.use(errorRequestHandler);
}
