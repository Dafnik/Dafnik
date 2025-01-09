---
title: 'Using react email with Kotlin Spring'
pubDate: 2025-01-09
description: 'Learn how to set up react email for your Kotlin Spring application using Gradle.'
image:
  url: 'kotlin-spring-react-email-thumbnail.webp'
  alt: 'The Astro logo on a dark background with a pink glow.'
---

In this guide, you'll learn how to integrate React Email into your Kotlin Spring project using Gradle.
With <a href="https://react.email" target="_blank">React Email</a>, you can benefit from React’s component-based architecture to build email templates more efficiently.

## Why opt for JavaScript when I already have Thymeleaf? (and still need Thymeleaf)

Although Thymeleaf is a powerful and essential templating engine—particularly for our purposes
here—its developer experience (DX) for designing email templates can be less than ideal.
This is where React Email shines. By leveraging React’s component composability,
you can create and maintain sophisticated email designs in a far more streamlined way than with Thymeleaf alone.

## Getting started

1. Create directory

   ```bash
   mkdir emails
   cd emails
   npm init
   ```

2. Install dependencies
   ```bash
   npm install react-email -D -E
   npm install @react-email/components react react-dom -E
   ```
3. Add scripts to your `package.json`

   ```bash
   {
     "scripts": {
       "dev": "email dev",
       "export": "email export --outDir ../src/main/resources/templates/html",
     }
   }
   ```

4. Add `node-gradle` to your `build.gradle.kts`

   ```kotlin
   plugins {
       // ...
       id("com.github.node-gradle.node") version "7.1.0"
   }
   ```

5. Add `spring-boot-starter-mail ` and `spring-boot-starter-thymeleaf` dependencies

   ```kotlin
   dependencies {
       // ...
       implementation("org.springframework.boot:spring-boot-starter-mail")
       implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
   }
   ```

6. Configure `node-gradle` and register the `exportEmail` task

   ```kotlin
   import com.github.gradle.node.npm.task.NpmTask

   node {
       npmInstallCommand = "ci"
       download = true
       version = "22.0.0"
       workDir = rootDir.resolve(".gradle/nodejs")
       npmWorkDir = rootDir.resolve(".gradle/npm")
       nodeProjectDir = rootDir.resolve("emails")
   }

   tasks.register<NpmTask>("exportEmails") {
       inputs.dir(rootDir.resolve("emails/emails"))
       inputs.files(rootDir.resolve("emails/package.json"), rootDir.resolve("emails/package-lock.json"))
       outputs.dir(projectDir.resolve("src/main/resources/templates/html"))
       dependsOn("npmInstall")
       npmCommand.addAll("run", "export")
   }
   ```

7. Configure the `processResources` task to depend on `exportEmails`

   ```kotlin
   tasks.processResources {
       dependsOn("exportEmails")

       // ...
   }
   ```

8. Add the generated html folder to `.gitignore`
   ```bash
   /src/main/resources/templates/html/
   ```
9. Create functionality for sending emails

   ```kotlin
   import org.springframework.context.annotation.Bean
   import org.springframework.context.annotation.Configuration
   import org.springframework.stereotype.Service
   import org.thymeleaf.TemplateEngine
   import org.thymeleaf.spring6.SpringTemplateEngine
   import org.thymeleaf.TemplateEngine
   import org.thymeleaf.context.Context

   @Configuration
   class ThymeleafConfiguration {
       @Bean
       fun templateEngine(): TemplateEngine = SpringTemplateEngine()
   }

   @Service
   class EmailTemplateService(
       private val templateEngine: TemplateEngine,
   ) {
       fun getRenderedMail(email: Email): EmailTemplateResponse {
           val context = email.context.applyDefaultContext(email.subject)
           return EmailTemplateResponse(
               plain = templateEngine.process(
                   "txt/${email.templateName}.txt",
                   context,
               ),
               html = templateEngine.process(
                   "html/${email.templateName}.html",
                   context,
               ),
           )
       }

       private fun Context.applyDefaultContext(subject: String) = this.apply {
           setVariable("metaTitle", subject)
           // Here can be added any default values for the context you want to have available in every email
       }
   }

   interface Email {
       val templateName: String
       val to: String
       val subject: String
       val context: Context
   }

   data class EmailTemplateResponse(val plain: String, val html: String)

   @Service
   class EmailService(
       private val emailTemplateService: EmailTemplateService,
   ) {
       fun send(email: Email) {
           val template = emailTemplateService.getRenderedMail(email)

           val mailSender = //...

           val mimeMessage: MimeMessage = mailSender.createMimeMessage()
           val helper = MimeMessageHelper(mimeMessage, true, "UTF-8")

           helper.setTo(email.to)
           helper.setSubject(email.subject)
           if (emailDto.html !== null) {
               helper.setText(template.plain, template.html)
           } else {
               helper.setText(template.plain)
           }
           helper.setFrom("your service <${email@your-service.com}>")
           mailSender.send(mimeMessage)
       }
   }
   ```

## Adding a new mail

1. **Create a new email** in `emails/emails`. For example `your-email.tsx`

   ```html
   <span>
     Hello
     <span th:text="${inviteeName}">Placeholder invitee name</span>
     ,
   </span>

   <button
     th:href="@{{host}/teams/join/{token}(host=${host}, token=${token})}"
     th:text="${joinButtonText}">
     Join the team
   </button>
   ```

2. **Develop your new email.** Run `./gradlew npm_start` and open [`localhost:3000`](http://localhost:3000) to preview it.

   Learn more about react email in their <a href="https://react.email/docs/introduction" target="_blank">documentation</a>.

3. **Export the HTML**. Once finished, run `./gradlew exportEmails` to generate your new HTML email template.
4. **Locate the result.** A `your-email.html` file should now appear in `src/main/resources/templates/html`.
5. **Add a matching text email.** In `src/main/resources/templates/txt`, create `your-email.txt`

   ```text
   Hello [(${inviteeName})],

   [(${joinButtonText})]: "[(${host})]/teams/invite/[(${token})]"
   ```

6. **Create your Kotlin email representation.**
   ```kotlin
   data class YourEmail(inviteeName: String, host: String, token: String) : Email {
      override val templateName = "your-email" //IMPORTANT
      override val to = listOf(email)
      override val subject = "Your email subject"
      override val context = Context().apply {
          setVariable("inviteeName", inviteeName) // All variables you need in your template.
          setVariable("joinButtonText", "Join the team $inviteeName")
          setVariable("host", host)
          setVariable("token", token)
      }
   }
   ```
7. **Use your new email anywhere in your code.**

   ```kotlin
   @Service
   class UserService(
       val emailService: EmailService,
   )

   emailService.send(
       YourEmail(
           inviteeName = "Max",
           host = "https://abc.xyz",
           token = "1234"
       )
   )
   ```

   Remember that you should not commit the generated HTML to version control—those files will be automatically generated at build time.
   However, you do need to commit your text email templates.

Happy emailing!
