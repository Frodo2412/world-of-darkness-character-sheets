Feature: Dot-rated traits

  Scenario: A new character's default ratings
    Given a player viewing a new character's sheet
    Then each of the nine attributes shows 1 dot
    And each of the three virtues shows 1 dot
    And every ability shows 0 dots

  Scenario: Setting a rating
    Given Strength shows 1 dot
    When the player activates the 4th Strength dot
    Then Strength shows 4 dots

  Scenario: Lowering a rating by activating the current dot
    Given Strength shows 4 dots
    When the player activates the 4th Strength dot
    Then Strength shows 3 dots

  Scenario: A rating can reach zero
    Given Appearance shows 1 dot
    When the player activates the 1st Appearance dot
    Then Appearance shows 0 dots

  Scenario Outline: Ratings stop at the top of their range
    Given a player viewing a character's sheet
    When they activate the last <trait> dot
    Then <trait> shows <max> dots
    And there is no dot beyond position <max>

    Examples:
      | trait     | max |
      | Strength  | 10  |
      | Brawl     | 10  |
      | Courage   | 5   |
      | Humanity  | 10  |
      | Willpower | 10  |

  Scenario: Ratings above normal creation limits are accepted
    Given a new character whose Generation is "13"
    When the player sets every attribute to 10
    Then every attribute shows 10 dots and nothing is flagged

  Scenario: Custom ability
    Given a player viewing a character's sheet
    When they name the blank Talent "Hobby Talent" and give it 2 dots
    And they reload the sheet
    Then the Talents list shows "Hobby Talent" with 2 dots

  Scenario: Disciplines and backgrounds
    Given a player viewing a character's sheet
    When they name the first discipline "Dominate" with 3 dots
    And they name the first background "Resources" with 2 dots
    And they reload the sheet
    Then "Dominate" shows 3 dots and "Resources" shows 2 dots
    And five discipline rows and five background rows remain blank

  Scenario: Humanity or Path
    Given a player viewing a character's sheet
    When they enter "Path of Night" as the path name, 6 dots, "Guilt" as bearing and "+1" as its modifier
    And they reload the sheet
    Then all four entries are shown as entered

  Scenario: Ratings are saved
    Given the player sets Dexterity to 3 and Brawl to 2 and Courage to 4
    When they reload the sheet
    Then Dexterity shows 3 dots, Brawl 2 dots and Courage 4 dots

  Scenario: Operating a rating from the keyboard
    Given keyboard focus is on the Strength rating showing 1 dot
    When the player presses the increase key twice
    Then Strength shows 3 dots
    And the rating reports its name and the value 3 to assistive technology
