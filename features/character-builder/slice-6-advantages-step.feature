Feature: Advantages step

  Scenario: Disciplines wait for a clan
    Given a build with no clan chosen
    When they open the advantages step
    Then they are told to choose a clan on the Concept step before placing Discipline dots
    And no Discipline dots can be placed

  Scenario: A clan offers exactly its three Disciplines
    Given a build of clan "Brujah"
    When they open the advantages step
    Then the Disciplines offered are exactly "Celerity", "Potence" and "Presence"
    And there are 3 Discipline dots remaining

  Scenario: Discipline dots can go on one Discipline or several
    Given a build of clan "Brujah"
    When they raise Celerity to 2
    And they raise Potence to 1
    Then there are 0 Discipline dots remaining

  Scenario: A fourth Discipline dot is refused
    Given a build of clan "Brujah" with Celerity rated 3
    When they try to raise Potence to 1
    Then they are told there are no Discipline dots remaining and more can be bought with freebie points on Finishing touches
    And Potence is rated 0

  Scenario: A Caitiff may take any Discipline
    Given a build of clan "Caitiff"
    When they add the Discipline "Protean" and raise it to 2
    And they add a write-in Discipline "Flight" and raise it to 1
    Then there are 0 Discipline dots remaining

  Scenario Outline: A write-in Discipline needs a usable name
    Given a build of clan "Caitiff" with the Discipline "Protean"
    When they try to add a write-in Discipline "<name>"
    Then they are told <reason>
    And the Disciplines are still only "Protean"

    Examples:
      | name     | reason                        |
      |          | a Discipline needs a name     |
      | protean  | the build already has Protean |

  Scenario: Changing clan asks before removing Disciplines
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Toreador"
    Then they are asked to confirm that the Potence dot will be removed because Toreador does not have it
    And declining keeps the clan "Brujah" with Potence rated 1

  Scenario: Confirming a clan change removes only what the new clan lacks
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Toreador" and confirm
    Then they are told the Potence dot was removed because Toreador does not have it
    And Celerity is rated 2
    And there are 1 Discipline dots remaining

  Scenario: Browsing the clan list with the keyboard removes nothing
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When using only the keyboard they move the clan choice past "Toreador" and "Tremere" and back to "Brujah"
    Then the clan is "Brujah" with Celerity rated 2 and Potence rated 1
    And keyboard focus never left the clan choice

  Scenario: A clan change names every Discipline it removes
    Given a build of clan "Caitiff" with Protean rated 2 and the write-in Discipline "Flight" rated 1
    When they choose the clan "Brujah" and confirm
    Then they are told the Protean and Flight dots were removed
    And there are 3 Discipline dots remaining

  Scenario: A clan change that removes nothing says nothing
    Given a build of clan "Brujah" with Celerity rated 2
    When they choose the clan "Toreador"
    Then no confirmation was asked
    And no clan-change notice is shown
    And Celerity is rated 2

  Scenario: Becoming a Caitiff keeps every Discipline
    Given a build of clan "Brujah" with Celerity rated 2 and Potence rated 1
    When they choose the clan "Caitiff"
    Then Celerity is rated 2
    And Potence is rated 1

  Scenario: Backgrounds come from the sourcebook list
    Given a player who has started building a character
    When they look at the Background choices
    Then the choices are exactly
      | Allies | Alternate Identity | Black Hand Membership | Contacts | Domain | Fame | Generation | Herd | Influence | Mentor | Resources | Retainers | Rituals | Status |

  Scenario: Five Background dots are available
    Given a player on the advantages step
    When they raise Resources to 3
    And they raise Herd to 2
    Then there are 0 Background dots remaining

  Scenario: A sixth Background dot is refused
    Given a build with Resources rated 3 and Herd rated 2
    When they try to raise Fame to 1
    Then they are told there are no Background dots remaining and more can be bought with freebie points on Finishing touches
    And Fame is rated 0

  Scenario: Generation dots improve the effective generation
    Given a build with base generation "11th"
    When they raise the Generation background to 2
    Then they are told, beside Generation, that the effective generation is now 9th with a blood pool maximum of 14
    And the settings step shows the effective generation "9th" beside the base generation "11th"
    And the blood points per turn are 2

  Scenario: Generation dots raise what other traits may reach
    Given a build with base generation "8th", Physical ranked primary and Strength rated 5
    When they raise the Generation background to 1
    And they raise Strength to 6
    Then Strength is rated 6

  Scenario: Generation dots cannot pass 4th generation
    Given a build with base generation "6th" and the Generation background rated 2
    When they try to raise the Generation background to 3
    Then they are told the effective generation cannot be better than 4th
    And the effective generation is "4th"

  Scenario: A 4th generation base accepts no Generation dots
    Given a build with base generation "4th"
    When they try to raise the Generation background to 1
    Then they are told the effective generation cannot be better than 4th
    And the Generation background is rated 0

  Scenario: Virtues start with one free dot each
    Given a player who has started building a character
    When they open the advantages step
    Then Conscience, Self-Control and Courage are each rated 1
    And there are 7 Virtue dots remaining

  Scenario: Seven Virtue dots are available
    Given a player on the advantages step
    When they raise Conscience to 4, Self-Control to 3 and Courage to 3
    Then there are 0 Virtue dots remaining

  Scenario: A Virtue offers five dots, whatever the generation
    Given a 4th generation build
    When they open the advantages step
    Then Courage reports 5 as its highest rating
    And Resources reports 9 as its highest rating

  Scenario: A Virtue keeps its free dot
    Given a player on the advantages step
    When they try to lower Conscience to 0
    Then Conscience is rated 1
    And Conscience reports 1 as its lowest rating

  Scenario: An eighth Virtue dot is refused
    Given a build with Conscience rated 4, Self-Control rated 3 and Courage rated 3
    When they try to raise Courage to 4
    Then they are told there are no Virtue dots remaining and more can be bought with freebie points on Finishing touches
    And Courage is rated 3

  Scenario: Removing Generation dots is refused while a trait depends on them
    Given a build with base generation "8th", the Generation background rated 1 and Strength rated 6
    When they try to lower the Generation background to 0
    Then they are told to lower Strength to 5 first, with a link to the Attributes step
    And the effective generation is "7th"

  Scenario: Choosing a less potent base generation is refused while a trait depends on it
    Given a build with base generation "7th" and Strength rated 6
    When they try to set the base generation to "8th"
    Then they are told to lower Strength to 5 first, with a link to the Attributes step
    And the base generation is "7th"

  Scenario: Choosing a more potent base generation is refused when Generation dots would pass 4th
    Given a build with base generation "6th" and the Generation background rated 2
    When they try to set the base generation to "5th"
    Then they are told to lower the Generation background to 1 first, with a link to the Advantages step
    And the base generation is "6th"

  Scenario: Settings can change when nothing is invalidated
    Given a 13th generation build with Strength rated 4 and Resources rated 3
    When they set the base generation to "10th"
    And they set the extra freebie points to 30
    Then Strength is rated 4
    And Resources is rated 3
    And the freebie budget is 45

  Scenario: Advantage choices survive a reload
    Given a build of clan "Ventrue" with Dominate rated 2, Resources rated 4 and Courage rated 3
    When they reload the builder
    Then Dominate is rated 2
    And Resources is rated 4
    And Courage is rated 3

  Scenario: The advantages step is accessible and fits a phone
    Given a build of clan "Caitiff" with a write-in Discipline, Backgrounds and Virtues placed
    When the advantages step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
