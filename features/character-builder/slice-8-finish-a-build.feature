Feature: Finishing a build

  Scenario: A new build lists everything outstanding
    Given a player who has started building a character
    When they open the finishing touches step
    Then the outstanding list shows exactly
      | item                                   | step       |
      | Choose a clan                          | Concept    |
      | Rank the Attribute groups              | Attributes |
      | Rank the Ability groups                | Abilities  |
      | Place 3 Discipline dots                | Advantages |
      | Place 5 Background dots                | Advantages |
      | Place 7 Virtue dots                    | Advantages |
    And the build cannot be finished

  Scenario Outline: One unplaced dot blocks finishing
    Given a complete build except for one <allotment> dot
    When they open the finishing touches step
    Then the outstanding list shows only "Place 1 <allotment> dot" for the <step> step
    And the build cannot be finished

    Examples:
      | allotment  | step       |
      | Mental     | Attributes |
      | Knowledges | Abilities  |
      | Discipline | Advantages |
      | Background | Advantages |
      | Virtue     | Advantages |

  Scenario: An overspent group blocks finishing
    Given a complete build whose Physical group is overspent by 2 dots
    When they open the finishing touches step
    Then the outstanding list shows only "Lower Physical traits by 2 dots" for the Attributes step
    And the build cannot be finished

  Scenario: A stored build that breaks a rule shows it as outstanding
    Given a stored 13th generation build whose Strength is rated 6
    When they open the finishing touches step
    Then the outstanding list shows an item naming Strength for the Attributes step
    And the build cannot be finished

  Scenario: An outstanding item leads to its step
    Given a complete build except for one Knowledges dot
    When they follow the outstanding item
    Then the "Abilities" step is shown

  Scenario: The outstanding list keeps itself up to date
    Given a complete build except for one Virtue dot
    When they place the last Virtue dot and return to the finishing touches step
    Then nothing is outstanding
    And the build can be finished

  Scenario: Every step offers a way to review and finish
    Given a player on the "Attributes" step of a new build
    When they use "Review and finish"
    Then the "Finishing touches" step is shown with keyboard focus on the outstanding list

  Scenario: Outstanding items come before the unspent-freebie question
    Given a build with one Virtue dot unplaced and 4 freebie points remaining
    When they open the finishing touches step
    Then the build cannot be finished
    And no confirmation is asked

  Scenario: A complete build with every freebie point spent finishes at once
    Given a complete build with 0 freebie points remaining
    When they finish the build
    Then the character sheet is shown

  Scenario Outline: Unspent freebie points ask for confirmation
    Given a complete build with <points> freebie points remaining
    When they try to finish the build
    Then they are asked whether to finish with <wording> unspent
    And the choices are "Finish with <wording> unspent" and "Keep editing", with "Keep editing" focused

    Examples:
      | points | wording          |
      | 4      | 4 freebie points |
      | 1      | 1 freebie point  |

  Scenario: Keeping editing returns to the builder
    Given a complete build with 4 freebie points remaining
    When they try to finish the build and choose "Keep editing"
    Then the builder is still shown with keyboard focus on the Finish button
    And there are 4 freebie points remaining
    And the roster lists no characters

  Scenario: Accepting the confirmation finishes the build
    Given a complete build with 4 freebie points remaining
    When they finish the build and accept the confirmation
    Then the character sheet is shown

  Scenario: The sheet shows what was built
    Given a complete build with base generation "11th" and these concept details
      | Name   | Player | Chronicle       | Nature | Demeanor | Concept      | Clan     | Sire    |
      | Lucita | Ana    | Madrid by Night | Rebel  | Gallant  | Fallen noble | Lasombra | Moncada |
    And the build has Strength rated 4 and Brawl rated 3
    And the build has the Disciplines Dominate rated 2 and Potence rated 1
    And the build has the Backgrounds Resources rated 3 and Generation rated 2
    And the build has Conscience rated 3, Self-Control rated 4 and Courage rated 3 from creation dots
    And the build has one freebie dot of Courage and one freebie dot of Willpower
    And the build has a starting blood pool of 6
    When they finish the build
    Then the sheet header shows every concept detail, and the generation "9th"
    And the sheet shows Strength 4 and Brawl 3
    And the sheet shows Conscience 3, Self-Control 4 and Courage 4
    And the sheet shows the path "Humanity" at 7
    And the sheet shows permanent Willpower 4 and temporary Willpower 4
    And the first two Discipline rows are "Dominate" at 2 and "Potence" at 1, and the other four are blank
    And the first two Background rows are "Generation" at 2 and "Resources" at 3, and the other four are blank
    And the sheet shows a blood pool of 6 and "2" blood per turn
    And the sheet's Weakness field is empty

  Scenario: A finished Nosferatu has no Appearance on the sheet
    Given a complete build of clan "Nosferatu"
    When they finish the build
    Then the sheet shows Appearance 0

  Scenario: A potent elder keeps ratings above 5 on the sheet
    Given a complete build with base generation "4th" and Strength rated 8
    When they finish the build
    Then the sheet shows Strength 8
    And the sheet shows the generation "4th" and "10" blood per turn

  Scenario: Finishing removes the build
    Given a complete build with 0 freebie points remaining
    When they finish the build
    Then opening the build's builder address shows "build not found"
    And the roster lists one character and no builds in progress

  Scenario: Going back after finishing does not bring the build back
    Given a player who has just finished a build
    When they go back in the browser
    Then they see a "build not found" message with a link to the roster
    And the roster lists one character and no builds in progress

  Scenario: Finishing twice creates one character
    Given a complete build with 0 freebie points remaining
    When they activate Finish twice in quick succession
    Then the roster lists one character

  Scenario: A failed save keeps the build
    Given a complete build with 0 freebie points remaining
    And the browser has started refusing to store data
    When they try to finish the build
    Then they are told the character could not be saved and the build has been kept
    And the builder is still shown
    And the build is still stored

  Scenario: A build that lingered after finishing cannot overwrite its character
    Given a finished character whose build was not removed
    And the player has since renamed the character "Lucita the Elder" on the sheet
    When they continue the lingering build and finish it
    Then they are told the build was already finished and has been removed
    And the roster lists one character named "Lucita the Elder" and no builds in progress

  Scenario: The review and finish panel is accessible and fits a phone
    Given a complete build with 4 freebie points remaining
    When the finishing touches step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally

  Scenario: A finished character is edited freely on the sheet
    Given a character finished from a 13th generation build
    When they raise Strength to 9 on the sheet
    Then the sheet shows Strength 9
    And no message is shown
