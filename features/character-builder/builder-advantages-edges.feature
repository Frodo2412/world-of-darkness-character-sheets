Feature: The Advantages screen keeps drawing whatever is typed, and keeps to six Backgrounds

  The slice scenarios hold what the screen does; the cases here are the ones a name a player types or
  a purchase made on another screen can reach: a written-in Discipline named with quotes and a
  backslash, a Sabbat Background named in a row, and freebie points spent on a seventh Background.

  Scenario: A Discipline written in with quotes and a backslash is listed and the screen keeps drawing
    Given a Caitiff build on the Advantages screen
    When I write in a Discipline whose name has quotes and a backslash
    Then that Discipline is listed
    When I give it 2 creation dots
    And I choose the Background chip Resources
    Then the Disciplines pool reads "1 remaining"
    And each chosen Background has a rating row
    When I reload the builder
    Then that Discipline is listed

  Scenario: A Sabbat Background is named in its refusal as its chip names it
    Given Rituals holds 2 dots
    When I choose the Rituals chip again
    Then the Backgrounds notice reads "Lower Rituals (Sabbat) to 0 first."

  Scenario: A Sabbat Background's row has a Remove button named as its chip is
    Given I am on the Advantages screen of a Toreador build
    And the Rituals chip is chosen at 0 dots
    Then the Rituals row has a button "Remove Rituals (Sabbat)"

  Scenario: Freebie points spent on a seventh Background leave six chosen
    Given I am on the Advantages screen of a Toreador build
    And the Background chips Allies, Contacts, Domain, Fame, Herd and Mentor are chosen at 0 dots
    When they buy one dot of Status with freebie points
    And I open the Advantages screen
    Then the Backgrounds count reads "Selected · 6/6"
    And the Status chip reads "Selected" and is pressed
    And Mentor is not chosen
