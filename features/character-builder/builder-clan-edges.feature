Feature: The Clan screen keeps to the browser's habits and to the build as it is now

  The slice scenarios hold what the Clan screen does; the cases here are the ones the page and the
  browser share: a question that outlives a change to the build, keys the browser owns, a modal dialog in
  front of the page, and the outline the chosen clan's detail gives assistive technology.

  Scenario: The switch question says plainly that no clan is kept when none is chosen
    Given a build with Social ranked primary and Appearance rated 4
    And I am on the Clan screen
    When I choose Nosferatu
    Then the clan question offers "Switch to Nosferatu" and "Keep no clan"

  Scenario: A question left open names what would be removed now
    Given a Toreador build with creation dots in Celerity
    When I choose Nosferatu
    Then the clan question's status region says "The Celerity dot will be removed"
    When they raise Presence to 1 on the advantages step
    And I open the Clan screen
    Then the clan question's status region says "The Celerity and Presence dots will be removed"

  Scenario: A question left open closes when the build no longer has anything to remove
    Given a Toreador build with 2 creation dots on Appearance
    When I choose Nosferatu
    Then I am told the Appearance dots would be removed
    When they lower Appearance to 1 on the attributes step
    And I open the Clan screen
    Then no clan question is open
    When I choose Nosferatu
    Then Nosferatu is chosen with no confirmation

  Scenario: A key the browser owns is not taken by the clan list
    Given I am on the Clan screen of a new build
    When I focus the first clan and press Alt+ArrowDown
    Then focus is still on the first clan
    When I focus the first clan and press Shift+ArrowDown
    Then focus is still on the first clan

  Scenario: The search shortcut is left to the browser behind a modal dialog
    Given I am on the Clan screen of a new build
    And the platform is "other"
    Then Control+K is taken by the page
    When I open Creation settings
    Then Control+K is left to the browser

  Scenario: The search is announced once typing settles
    Given I am on the Clan screen of a new build
    When I type "tor" into the clan search one key at a time
    Then the clan result count "1 clan listed" is announced once

  Scenario: The search hint steps aside while the search holds text
    Given I am on the Clan screen of a new build
    Then the clan search hint is shown
    When I search the clans for "tor"
    Then the clan search hint is hidden
    When I empty the clan search
    Then the clan search hint is shown

  Scenario: The clan list says how its keys work
    Given I am on the Clan screen of a new build
    Then the clan list is described as moving with the arrow keys and choosing with Space or Enter

  Scenario: The chosen clan's detail is a region headed by the clan's name
    Given a Toreador build with no Discipline dots
    Then the chosen clan region is headed "Toreador" at level 3
