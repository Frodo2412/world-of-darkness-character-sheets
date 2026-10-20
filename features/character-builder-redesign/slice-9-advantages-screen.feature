Feature: The Advantages screen

  Background:
    Given I am on the Advantages screen of a Toreador build

  Scenario: A clan's Disciplines are the rows
    Then Auspex, Celerity and Presence are listed and the Disciplines pool reads "3 remaining"

  Scenario: No clan chosen yet
    Given a build with no clan on the Advantages screen
    Then the reason reads "Choose a clan to place Discipline dots"
    And a button "Go to Clan" is offered
    And the text beside Continue reads "Choose a clan to place Discipline dots"

  Scenario: A Caitiff places dots on any Discipline
    Given a Caitiff build on the Advantages screen
    When I add Vicissitude and give it 3 creation dots
    Then Vicissitude holds 3 dots and the Discipline pool reads "Complete"

  Scenario: Choosing Backgrounds
    When I choose the Background chips Contacts, Resources and Mentor
    Then each chosen Background has a rating row
    And the Backgrounds pool reads "5 remaining"

  Scenario: A chosen chip is selected in text and in state
    When I choose the Background chip Resources
    Then the Resources chip reads "Selected" and is pressed
    And the other Background chips are not selected

  Scenario: The keys for the Background chips are named
    Then the Background chips are described as "Tab moves between chips; Space or Enter chooses or clears a Background."

  Scenario: Sabbat Backgrounds are labelled
    Then the chips for Black Hand Membership and Rituals read "(Sabbat)"
    When I give Rituals 1 creation dot and finish a finishable build
    Then the finished character's row is named "Rituals"

  Scenario: At most six Backgrounds
    Given a build seeded with six Backgrounds each holding a dot
    Then the other Background chips are unavailable with the reason "Six is the most"

  Scenario: Chips at 0 dots count towards the six
    Given a build with five Backgrounds holding dots and a sixth chip chosen at 0 dots
    Then the other Background chips are unavailable

  Scenario: A chip that cannot be chosen explains itself when pressed
    Given a build seeded with six Backgrounds each holding a dot
    When I press a Background chip that is unavailable
    Then "Six is the most" is announced
    And the chip is still unavailable and still focused

  Scenario: Generation is limited by the base generation
    Given a build at base 6th generation
    When I raise the Generation Background as far as it goes
    Then it cannot go above 2 dots
    And I am told why

  Scenario: Searching Backgrounds
    When I search the Backgrounds for "re"
    Then only Resources and Retainers are shown
    And the Backgrounds count heading reads "All Backgrounds · 2"
    And the Backgrounds result count "2 Backgrounds listed" is announced

  Scenario: A search with no match
    When I search the Backgrounds for "zzz"
    Then none are shown and I am told nothing matches and it is announced

  Scenario Outline: The search shortcut on each platform
    Given the platform is "<platform>"
    And I am on the Advantages screen
    When I press <keys>
    Then focus is in the Backgrounds search field
    And the Backgrounds search hint reads "<hint>"

    Examples:
      | platform | keys      | hint   |
      | macOS    | Meta+K    | ⌘K     |
      | other    | Control+K | Ctrl K |

  Scenario: Removing an empty row
    Given a Background row at 0 dots
    When I remove it
    Then its chip is no longer selected
    And focus is on its chip

  Scenario: A chip that holds dots cannot be deselected silently
    Given Contacts holds 2 dots
    When I choose the Contacts chip again
    Then I am told to lower Contacts to 0 first
    And Contacts still holds 2 dots

  Scenario: A chosen but empty Background is only a choice of this screen
    Given the Resources chip is chosen at 0 dots
    When I reload the builder
    Then Resources is not chosen

  Scenario: Virtues
    Then each Virtue shows at least one dot and the pool reads "7 remaining"
    When 6 of the 7 Virtue dots are placed
    Then the Virtues callout says 6 of 7 additional Virtue dots are placed and 1 remains
    And a line says Humanity and Willpower are derived from the Virtues

  Scenario: Spending beyond the pools is not possible here
    Given the Backgrounds pool is fully placed
    When I press a plus on Backgrounds
    Then the plus controls on Backgrounds are unavailable
    And no freebie point was spent

  Scenario: Screen standards
    When I choose Character concept in the sidebar and then Advantages
    Then focus is on the Advantages heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with a callout, chosen chips, a search and a refusal shown
    Given Resources holds 2 dots and the Mentor chip is chosen at 0 dots
    When 6 of the 7 Virtue dots are placed
    And I search the Backgrounds for "re"
    And I choose the Resources chip again
    Then the Virtues callout says 6 of 7 additional Virtue dots are placed and 1 remains
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with six Backgrounds chosen
    Given a build seeded with six Backgrounds each holding a dot
    Then axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with no clan chosen
    Given a build with no clan on the Advantages screen
    Then axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
