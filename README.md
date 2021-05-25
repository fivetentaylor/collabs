# Compoventuals

One day, we'll come up with a better name.

(Template based on [ts-demo-webpack](https://github.com/rauschma/ts-demo-webpack))

## Building

First, ensure you have npm 7 or higher:

```bash
$ npm -v
```

If this is not the case, you can update to the latest version using:

```bash
$ npm install -g npm@latest
```

Then, install dependencies and build all sources.
It's best to run the build before opening your IDE, as we generate some sources.

```bash
$ npm install
$ npm run build
```

You can also run all tests to ensure that everything is working as expected:

```bash
$ npm run test
```

**Note:**
When running these commands from the top-level directory, it will be run in all subprojects automatically.
You can also run them in each subproject to achieve the same result.
Note that some subprojects also support `npm run tscw` or `npm run wpw` to have things rebuild automatically on file save.

## Viewing documentation

TypeDoc documentation is created in the docs/ directory of each subpackage as part of `npm run build`. You can view it by opening docs/index.html in a browser.

## How to run the local server?

Run the following command under root folder `/compoventuals`, the local server will listen on port `3000`:

```bash
$ npm start
```

Access the service via `localhost:3000`, look at the console to see outputs of current deployment.

## How to build on Heroku?

Deploys to https://compoventuals-tests.herokuapp.com/

- The Heroku deployment will be automatically triggered by `git commit` and `git push`.
- The Heroku server will run `npm install` and `npm build` to build the project, and `npm start` to run it (according to Procfile).

Options for manually deployment:

- Log in your Heroku with CLI tool and verify on browser:

```
heroku login
```

- Create a heroku project on your machine by running (in the repo's top-level directory):

```
heroku create
```

This should also create a git remote repo named `heroku`. See [here](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote) for how to customize or repair this if needed.

- Commit and push the code on Heroku master just like the way you do on Github:

```
git add ${selected files}
git commit -m ${commit messages}
git push heroku master
git push
```

## Development

We recommend setting up "Format on Save" in your editor.
See [Prettier's editor setup instructions](https://prettier.io/docs/en/editors.html).

If you don't set this, you'll need to run `npm run fix` in the top-level directory before committing and pushing your code to github. Otherwise, the CI will complain that the format is wrong.
