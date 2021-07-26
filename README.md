# Family Game Night
I was looking for some games that __the entire family__ could play online.
I couldn't find anything good, so I made my own.

I looked at several existing options.
You can buy Uno from Steam.
That must be aimed at professionals; you can't turn off the timeout.
I'm not kicking out a family member for refilling their soft drink in the middle of a game!

Let's recreate family game night, even though we've all moved away.
## Template
I started from the template at https://github.com/TradeIdeasPhilip/deno-client-server-typescript-template.
Unfortunately that project is not ready for prime time yet.
(One of the reasons I created the family game night project was to test and improve the template.)

Somehow the automatic complier built into the server broke.
For now I replaced that compiler with a warning message.
If you try to read a `*.js` file that is older than the corresponding `*.ts` file, a message will appear in the server's debug console.
~~I reconfigured the client project to automatically run typescript, so as long as you make changes from VS code (and you do the one time setup described in everything-else/.vscode/tasks.json) things should still work.~~

## Status
Automatic compiles are completely broken.
My custom library that rebuilds `*.ts` to `*.js` as needed in the web server is broken and I don't know why.
Then I tried running tsc in watch mode, but, as [this article](https://github.com/microsoft/vscode/issues/31294) explains, Microsoft broke that feature.
I also tried what the article suggested, but that didn't work either.
Any time you change the source code, remember to hit control-shift-b to rebuild the project.