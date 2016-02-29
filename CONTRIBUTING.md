# Contributing to Argon

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

#### Table of Contents

[How can I help?](#how-can-i-help)
 * [Reporting Bugs](#reporting-bugs)
 * [Suggestions](#making-suggestions)
 * [Pull Requests](#pull-requests)

[:sparkles:Style:sparkles:](#style-guidelines)
 * [Branching Scheme](#our-branching-model)
 * [Typescript](#typescript-style)

[Tests](#testing)

## How can I help?

You can help in so many ways!
Whether it's asking questions on our slack or on StackOverflow or even contributing code, we love any help we can get!

### Reporting Bugs

Reporting bugs is great and you should do it (if you find a bug)! Just make a bug report through GitHub and make sure to include the following:

 * What was the bug?
 * What did you expect to happen instead?
 * A piece of sample code that shows the bug is always great.

Please watch your GitHub inbox when you file a bug report so we can ask you questions.


### Making Suggestions

Making suggestions is even easier than filing the bug report, simply file a bug with your suggestion and prepend `[Enhancement]` in the title. We will tag it accordingly.


### Pull Requests

Sending PRs are a little more complicated than bugs. Please follow the style guidelines and the branching scheme described [here](#style-guidelines) and make sure that your branch passes all of our tests described [here](#tests).



## Style Guidelines

The general style guidelines are as follows:

 * We use 4 spaces to indent **all** source files
 * No trailing spaces


### Our Branching Model

We want to follow a pretty simple branching model. All changes that are more than one commit are put into their own branch and prepended with `fix.` or `feature.`.

When the branch is merged all changes must be rebased to the top of the branch it is merged into and it is merged without fast-forwarding.

This is to keep the history linear but with bubble commits. It basically looks like so:
![branching-model](http://nvie.com/img/merge-without-ff@2x.png)

When you make a branch simply decide a prefix that fits for it out of:
 * `fix.`
 * `feature.`

Then create a pull request against the `develop` branch. Once it is merged into `develop` it will be tested thoroughly.
Once in a while any new features are merged into the master branch and tagged with a new release version.
We use the semantic versioning scheme.


### Typescript Style

The typescript style is described in our `.tslint.json` file.
Our tests will automatically check for style and print out helpful messages.


## Testing

Testing is easy and it simply involves running the included scripts in the repo.
